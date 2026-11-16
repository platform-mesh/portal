import { inject, Injectable } from '@angular/core';
import { AuthConfigService, EnvConfigService } from '@openmfp/portal-ui-lib';

@Injectable()
export class PMAuthConfigService extends AuthConfigService {
  private envConfig = inject(EnvConfigService);

  // Identity providers other than Keycloak put e-mail and groups into the
  // token only when their scopes are requested, and may accept only exactly
  // registered redirect URIs.
  override async getAuthConfig() {
    const authConfig = await super.getAuthConfig();
    const { oidc, baseDomain } = await this.envConfig.getEnvConfig();
    if (!authConfig) {
      return authConfig;
    }

    const oAuthData = authConfig.oAuth2AuthCode.oAuthData;
    if (oidc?.scope) {
      oAuthData.scope = oidc.scope;
    }
    if (oidc?.callbackOnBaseDomain && baseDomain) {
      const baseOrigin = new URL(window.location.origin);
      baseOrigin.hostname = baseDomain;
      oAuthData.redirect_uri = `${baseOrigin.origin}${oAuthData.redirect_uri}`;
    }
    return authConfig;
  }
}
