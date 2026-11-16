import { PMEnvVariablesProvider } from './env-variables.provider';

describe('PMEnvVariablesProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns the configured OIDC scope', async () => {
    process.env.OIDC_SCOPE = 'openid email groups';

    const env = await new PMEnvVariablesProvider().getEnv();

    expect(env).toEqual({ oidc: { scope: 'openid email groups' } });
  });

  it('tells the frontend to use the callback of the base domain', async () => {
    delete process.env.OIDC_SCOPE;
    process.env.OIDC_CALLBACK_ON_BASE_DOMAIN = 'true';

    const env = await new PMEnvVariablesProvider().getEnv();

    expect(env).toEqual({ oidc: { callbackOnBaseDomain: true } });
  });

  it('returns nothing when OIDC is not configured', async () => {
    delete process.env.OIDC_SCOPE;
    delete process.env.OIDC_CALLBACK_ON_BASE_DOMAIN;

    const env = await new PMEnvVariablesProvider().getEnv();

    expect(env).toEqual({});
  });
});
