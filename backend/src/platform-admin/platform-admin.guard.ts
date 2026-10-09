import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HeaderParserService } from '@openmfp/portal-server-lib';
import { AuthzWebhookService } from '@platform-mesh/portal-server-lib/portal-options';
import type { Request } from 'express';

const ORGS_ACCOUNT_GROUP = 'core.platform-mesh.io';
const ORGS_ACCOUNT_RESOURCE = 'accounts';

// INTERIM: Platform Administrator is currently identified as the owner of the
// root:orgs account. In the FGA core module `delete` on an account maps to the
// `owner` relation, so probing `delete accounts` at the root:orgs cluster path
// checks ownership.
//
// This is a pragmatic shortcut until a dedicated `platform_admin` FGA relation
// is introduced in security-operator/data/coreModule.fga and exposed via
// iam-service/input/roles.yaml. When that work is done, replace this probe with
// a check for the new relation and update the guard accordingly.
//
// TODO: replace owner-reuse with proper platform_admin role check once
// https://github.com/platform-mesh/backlog/issues/TBD is resolved.
const OWNER_PROBE_VERB = 'delete';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly headerParser: HeaderParserService,
    private readonly authz: AuthzWebhookService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.headerParser.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    // Empty organization/accountPath resolve the cluster path to the root:orgs
    // account itself (buildWorkspacePath([]) === 'root:orgs').
    const permissions = await this.authz.checkActionsForResource({
      token,
      organization: '',
      accountPath: '',
      checks: [
        {
          resource: ORGS_ACCOUNT_RESOURCE,
          group: ORGS_ACCOUNT_GROUP,
          actions: [OWNER_PROBE_VERB],
        },
      ],
    });

    // undefined = permission checks disabled (webhook not configured or
    // unreachable). Fail open to match the portal-wide permission behaviour.
    if (permissions === undefined) {
      return true;
    }

    const allowed = permissions.some(
      (p) =>
        p.resource === ORGS_ACCOUNT_RESOURCE &&
        p.actions.includes(OWNER_PROBE_VERB),
    );
    if (!allowed) {
      throw new ForbiddenException('Platform administrator role required');
    }
    return true;
  }
}
