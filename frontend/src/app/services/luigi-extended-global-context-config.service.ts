import { Injectable, inject } from '@angular/core';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
  LuigiExtendedGlobalContextConfigService,
  ResourceService,
} from '@openmfp/portal-ui-lib';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LuigiExtendedGlobalContextConfigServiceImpl
  implements LuigiExtendedGlobalContextConfigService
{
  private resourceService = inject(ResourceService);
  private envConfigService = inject(EnvConfigService);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);

  async createLuigiExtendedGlobalContext(): Promise<Record<string, any>> {
    const portalConfig = await this.configService.getPortalConfig();
    const entityId = (await this.envConfigService.getEnvConfig()).organization;
    const operation = 'core_platform_mesh_io';
    const kind = 'Account';
    const queryPart = '{ metadata { name annotations } }';

    try {
      const resource = await firstValueFrom(
        this.resourceService.read(
          entityId,
          operation,
          kind,
          `query ($name: String!) { ${operation} { ${kind}(name: $name) ${queryPart} }}`,
          {
            portalContext: {
              crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
            },
            token: this.authService.getToken(),
            accountId: entityId,
          },
        ),
      );

      const resourceKcpIoClusterAnnotation =
        resource?.metadata?.annotations?.['kcp.io/cluster'];
      if (!resourceKcpIoClusterAnnotation) {
        console.warn(
          `Cluster annotation (kcp.io/cluster) missing for resource: ${entityId}`,
        );
        return {};
      }

      return {
        organizationId: `${resourceKcpIoClusterAnnotation}/${entityId}`,
        entityId: `${resourceKcpIoClusterAnnotation}/${entityId}`, // if no entity selected the entityId is the same as the organizationId
      };
    } catch (e) {
      console.error(`Failed to read entity ${entityId} from ${operation}`, e);
    }
    return {};
  }
}
