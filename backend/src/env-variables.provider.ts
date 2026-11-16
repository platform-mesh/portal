import { Injectable } from '@nestjs/common';
import { EnvVariablesService } from '@openmfp/portal-server-lib';
import { callbackOnBaseDomain } from './cookies.service.js';

@Injectable()
export class PMEnvVariablesProvider implements EnvVariablesService {
  // OIDC_SCOPE: scopes the frontend requests at login instead of its default.
  async getEnv(): Promise<Record<string, object>> {
    const oidc: Record<string, unknown> = {};
    if (process.env.OIDC_SCOPE) {
      oidc.scope = process.env.OIDC_SCOPE;
    }
    if (callbackOnBaseDomain()) {
      oidc.callbackOnBaseDomain = true;
    }
    return Object.keys(oidc).length > 0 ? { oidc } : {};
  }
}
