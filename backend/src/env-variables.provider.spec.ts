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

  it('returns nothing when no OIDC scope is configured', async () => {
    delete process.env.OIDC_SCOPE;

    const env = await new PMEnvVariablesProvider().getEnv();

    expect(env).toEqual({});
  });
});
