import { inject, Injectable } from '@angular/core';
import { AuthConfigService, EnvConfigService } from '@openmfp/portal-ui-lib';

@Injectable()
export class PMAuthConfigService extends AuthConfigService {
  private envConfig = inject(EnvConfigService);

  // Identity providers other than Keycloak put e-mail and groups into the
  // token only when their scopes are requested.
  override async getAuthConfig() {
    const authConfig = await super.getAuthConfig();
    const { oidc } = await this.envConfig.getEnvConfig();
    if (authConfig && oidc?.scope) {
      authConfig.oAuth2AuthCode.oAuthData.scope = oidc.scope;
    }
    return authConfig;
  }
}
