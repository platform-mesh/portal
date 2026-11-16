import { Injectable } from '@nestjs/common';
import { EnvVariablesService } from '@openmfp/portal-server-lib';

@Injectable()
export class PMEnvVariablesProvider implements EnvVariablesService {
  // OIDC_SCOPE: scopes the frontend requests at login instead of its default.
  async getEnv(): Promise<Record<string, object>> {
    const scope = process.env.OIDC_SCOPE;
    return scope ? { oidc: { scope } } : {};
  }
}
