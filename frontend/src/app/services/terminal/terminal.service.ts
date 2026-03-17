import { Terminal, TerminalSubscriptionEvent } from './terminal.types';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  Resource,
  ResourceDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ApolloFactory,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { gql } from 'apollo-angular';
import {
  Observable,
  catchError,
  filter,
  firstValueFrom,
  map,
  take,
  timeout,
} from 'rxjs';

const TERMINAL_RESOURCE_DEFINITION: ResourceDefinition = {
  apiGroup: 'terminal_platform_mesh_io',
  version: 'v1alpha1',
  entity: 'Terminal',
  entityCollection: 'Terminals',
  scope: 'Cluster' as const,
};

const CREATE_TERMINAL_MUTATION = gql`
  mutation CreateTerminal($object: TerminalInput!) {
    terminal_platform_mesh_io {
      v1alpha1 {
        createTerminal(object: $object) {
          metadata {
            name
            resourceVersion
          }
        }
      }
    }
  }
`;

const WATCH_TERMINAL_SUBSCRIPTION = gql`
  subscription WatchTerminal($name: String!) {
    terminal_platform_mesh_io_v1alpha1_terminal(name: $name) {
      type
      object {
        metadata {
          name
          resourceVersion
        }
        status {
          phase
          sessionId
          podName
          workspacePath
        }
      }
    }
  }
`;

const GET_TERMINAL_QUERY = gql`
  query GetTerminal($name: String!) {
    terminal_platform_mesh_io {
      v1alpha1 {
        Terminal(name: $name) {
          metadata {
            name
            resourceVersion
          }
          status {
            phase
            sessionId
            podName
            workspacePath
          }
        }
      }
    }
  }
`;

interface GetTerminalResponse {
  terminal_platform_mesh_io: {
    v1alpha1: {
      Terminal: Terminal | null;
    };
  };
}

interface CreateTerminalResponse {
  terminal_platform_mesh_io: {
    v1alpha1: {
      createTerminal: {
        metadata: {
          name: string;
          resourceVersion: string;
        };
      };
    };
  };
}

interface WatchTerminalResponse {
  terminal_platform_mesh_io_v1alpha1_terminal: TerminalSubscriptionEvent;
}

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private resourceService = inject(ResourceService);
  private apolloFactory = inject(ApolloFactory);
  private luigiCoreService = inject(LuigiCoreService);

  async getOrCreateTerminal(): Promise<Terminal> {
    const userSub = this.extractSubFromToken();

    if (!userSub) {
      throw new Error('Could not extract user identity from token');
    }

    const terminalName = userSub;

    // Check if terminal already exists
    let existing = await this.getTerminal(terminalName);

    if (existing) {
      const phase = existing.status?.phase;

      if (phase === 'Ready') {
        return existing;
      }

      // If terminal is being deleted (Terminating) or Failed, wait for deletion and create new
      if (phase === 'Terminating' || phase === 'Failed') {
        if (phase === 'Failed') {
          await this.deleteTerminal(terminalName);
        }

        await this.waitForTerminalDeletion(terminalName);
      } else {
        // Terminal exists and is in Pending/Creating state, return it to wait for ready
        return existing;
      }
    }

    // Create new terminal
    return this.createTerminal(terminalName, userSub);
  }

  private async waitForTerminalDeletion(name: string, maxAttempts: number = 30): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const terminal = await this.getTerminal(name);

      if (!terminal) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout waiting for terminal deletion');
  }

  private async getTerminal(name: string): Promise<Terminal | null> {
    const nodeContext = this.buildNodeContext();

    try {
      const result = await firstValueFrom(
        this.apolloFactory.apollo(nodeContext).query<GetTerminalResponse>({
          query: GET_TERMINAL_QUERY,
          variables: { name },
          fetchPolicy: 'network-only',
        })
      );

      return result.data?.terminal_platform_mesh_io.v1alpha1.Terminal || null;
    } catch {
      return null;
    }
  }

  private async createTerminal(name: string, userSub: string): Promise<Terminal> {
    const nodeContext = this.buildNodeContext();

    try {
      const result = await firstValueFrom(
        this.apolloFactory.apollo(nodeContext).mutate<CreateTerminalResponse>({
          mutation: CREATE_TERMINAL_MUTATION,
          variables: {
            object: {
              metadata: {
                name,
                annotations: {
                  'kcp.io/user-info': userSub,
                },
              },
            },
          },
        })
      );

      const metadata =
        result.data?.terminal_platform_mesh_io.v1alpha1.createTerminal.metadata;

      if (!metadata) {
        throw new Error('Failed to create terminal: no metadata returned');
      }

      return {
        metadata: {
          name: metadata.name,
          resourceVersion: metadata.resourceVersion,
        },
        spec: {},
      };
    } catch (err) {
      // Handle "already exists" error - fetch and return the existing terminal
      if (err instanceof Error && err.message.includes('already exists')) {
        const existing = await this.getTerminal(name);
        if (existing) {
          return existing;
        }
      }
      throw err;
    }
  }

  watchTerminal(name: string): Observable<TerminalSubscriptionEvent> {
    const nodeContext = this.buildNodeContext();

    return this.apolloFactory
      .apollo(nodeContext)
      .subscribe<WatchTerminalResponse>({
        query: WATCH_TERMINAL_SUBSCRIPTION,
        variables: { name },
      })
      .pipe(
        map((result) => result.data?.terminal_platform_mesh_io_v1alpha1_terminal),
        filter((event): event is TerminalSubscriptionEvent => {
          return !!event && event.object?.metadata?.name === name;
        })
      );
  }

  waitForTerminalReady(
    name: string,
    timeoutMs: number = 120000
  ): Observable<Terminal> {
    return this.watchTerminal(name).pipe(
      filter((event) => {
        const phase = event.object.status?.phase;
        return phase === 'Ready' || phase === 'Failed';
      }),
      take(1),
      timeout(timeoutMs),
      map((event) => {
        if (event.object.status?.phase === 'Failed') {
          throw new Error('Terminal failed to start');
        }
        return event.object;
      }),
      catchError((err) => {
        throw err;
      })
    );
  }

  async deleteTerminal(name: string): Promise<void> {
    const nodeContext = this.buildNodeContext();
    const resource = { metadata: { name } } as Resource;
    try {
      await firstValueFrom(
        this.resourceService.delete(
          resource,
          TERMINAL_RESOURCE_DEFINITION,
          nodeContext
        )
      );
    } catch {
      // Terminal may already be deleted
    }
  }

  private buildNodeContext(): ResourceNodeContext {
    const globalContext = this.luigiCoreService.getGlobalContext();
    const authData = this.luigiCoreService.getAuthData();
    return {
      portalContext: {
        crdGatewayApiUrl: globalContext['portalContext']?.['crdGatewayApiUrl'],
      },
      resourceDefinition: TERMINAL_RESOURCE_DEFINITION,
      token: authData?.idToken,
    };
  }

  private extractSubFromToken(): string | null {
    const authData = this.luigiCoreService.getAuthData();
    const token = authData?.idToken;

    if (!token) {
      return null;
    }

    try {
      // JWT is base64url encoded: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode payload (base64url -> base64 -> JSON)
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const decoded = atob(payload);
      const claims = JSON.parse(decoded);

      return claims.sub || null;
    } catch {
      return null;
    }
  }

}
