import { TestBed } from '@angular/core/testing';
import { AuthService, EnvConfigService } from '@openmfp/portal-ui-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PMAuthConfigService } from './pm-auth-config.service';

describe('PMAuthConfigService', () => {
  const getEnvConfig = vi.fn();
  let service: PMAuthConfigService;

  beforeEach(() => {
    getEnvConfig.mockReset();
    TestBed.configureTestingModule({
      providers: [
        PMAuthConfigService,
        { provide: AuthService, useValue: {} },
        { provide: EnvConfigService, useValue: { getEnvConfig } },
      ],
    });
    service = TestBed.inject(PMAuthConfigService);
  });

  it('requests the configured scope', async () => {
    getEnvConfig.mockResolvedValue({
      oauthServerUrl: 'https://issuer.example/auth',
      clientId: 'platform-mesh',
      oidc: { scope: 'openid email groups' },
    });

    const config = await service.getAuthConfig();

    expect(config?.oAuth2AuthCode.oAuthData.scope).toBe('openid email groups');
    expect(config?.oAuth2AuthCode.oAuthData.client_id).toBe('platform-mesh');
  });

  it('keeps the default scope when none is configured', async () => {
    getEnvConfig.mockResolvedValue({
      oauthServerUrl: 'https://issuer.example/auth',
      clientId: 'platform-mesh',
    });

    const config = await service.getAuthConfig();

    expect(config?.oAuth2AuthCode.oAuthData.scope).toBe('openid');
  });

  it('returns no auth config without an authorization endpoint', async () => {
    getEnvConfig.mockResolvedValue({ oidc: { scope: 'openid email groups' } });

    expect(await service.getAuthConfig()).toBeUndefined();
  });
});
