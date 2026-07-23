import {
  OPEN_PERSISTENT_PANEL_MESSAGE,
  mergePersistentPanelTargets,
  parsePersistentPanelConfig,
  persistentPanelTarget,
} from './persistent-panel.types';
import { describe, expect, it } from 'vitest';

const trustedNode = (viewUrl: string) => ({
  viewUrl,
  context: {
    persistentPanel: { id: 'provider.tools', title: 'Provider tools' },
  },
});

describe('persistent provider panel contract', () => {
  it('derives the iframe URL and exact origin from the registered provider UI', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: {
            id: 'provider.tools',
            title: 'Provider tools',
            url: 'https://attacker.example/panel',
          },
        },
        trustedNode('https://provider.example.test/panel?mode=embedded'),
        'https://portal.example.test',
      ),
    ).toEqual({
      id: 'provider.tools',
      title: 'Provider tools',
      url: 'https://provider.example.test/panel?mode=embedded',
      origin: 'https://provider.example.test',
    });
  });

  it('supports a registered relative provider UI URL', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: { id: 'provider.tools', title: 'Provider tools' },
        },
        trustedNode('/provider/panel'),
        'https://portal.example.test',
      ),
    ).toMatchObject({
      url: 'https://portal.example.test/provider/panel',
      origin: 'https://portal.example.test',
    });
  });

  it('rejects a missing or unsafe registered provider UI URL', () => {
    const message = {
      id: OPEN_PERSISTENT_PANEL_MESSAGE,
      panel: { id: 'provider.tools', title: 'Provider tools' },
    };

    expect(() =>
      parsePersistentPanelConfig(
        message,
        undefined,
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel id/i);
    expect(() =>
      parsePersistentPanelConfig(
        message,
        trustedNode('javascript:alert(1)'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL/i);
    expect(() =>
      parsePersistentPanelConfig(
        message,
        trustedNode('https://user:password@provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL/i);
    expect(() =>
      parsePersistentPanelConfig(
        message,
        trustedNode('http://provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL/i);
  });

  it('derives identity from trusted node metadata and rejects missing capability', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: { id: 'attacker.panel', title: 'Impersonated UI' },
        } as Record<string, unknown> & { id: string },
        trustedNode('https://provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toMatchObject({ id: 'provider.tools', title: 'Provider tools' });

    expect(() =>
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: { id: 'provider.tools', title: 'Provider tools' },
        },
        { viewUrl: 'https://provider.example.test/panel' },
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel id/i);
    expect(() =>
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
        },
        {
          viewUrl: 'https://provider.example.test/panel',
          context: {
            persistentPanel: { id: '../provider', title: 'Provider tools' },
          },
        },
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel id/i);
  });

  it('allows an HTTP loopback panel only from an HTTP development Portal', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: { id: 'provider.tools', title: 'Provider tools' },
        },
        trustedNode('http://127.0.0.1:8080/panel'),
        'http://localhost:4200',
      ),
    ).toMatchObject({ origin: 'http://127.0.0.1:8080' });
  });

  it('projects only bounded account and workspace fields and never credentials', () => {
    const target = persistentPanelTarget(
      {
        organization: 'org-a',
        token: 'must-not-leak',
        portalContext: { crdGatewayApiUrl: 'must-not-leak' },
      },
      {
        portalContext: {},
        entityId: 'parent/default',
        accountId: 'team-a',
        userId: 'must-not-leak',
        userEmail: 'must-not-leak',
        token: 'must-not-leak',
        portalBaseUrl: 'must-not-leak',
        accountPath: 'root:orgs:org-a:team-a',
        kcpPath: 'root:orgs:org-a:team-a',
        namespaceId: 'apps',
        entityName: 'example',
        entityKind: 'Database',
        resourceDefinition: {
          group: 'database.example.io',
          version: 'v1alpha1',
          kind: 'Database',
        },
      },
    );

    expect(target).toEqual({
      organization: 'org-a',
      account: 'team-a',
      accountPath: 'root:orgs:org-a:team-a',
      workspacePath: 'root:orgs:org-a:team-a',
      namespace: 'apps',
      resource: {
        group: 'database.example.io',
        version: 'v1alpha1',
        kind: 'Database',
        name: 'example',
      },
    });
    expect(JSON.stringify(target)).not.toMatch(
      /must-not-leak|token|gateway|email/i,
    );
  });

  it('projects the observed Portal account shape without unrelated context', () => {
    const target = persistentPanelTarget({
      organization: 'showroom',
      organizationId: 'parent/showroom',
      accountId: 'ig-1',
      entityId: 'parent/default',
    });

    expect(target).toEqual({
      organization: 'showroom',
      organizationId: 'parent/showroom',
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
    expect(target).not.toHaveProperty('contextId');
  });

  it('projects an observed organization context without invalid descendants', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        organizationId: 'parent/showroom',
        kcpPath: 'root:orgs:showroom',
        entityId: 'parent/default',
      }),
    ).toEqual({
      organization: 'showroom',
      organizationId: 'parent/showroom',
    });
  });

  it('uses bounded account fields in their canonical precedence order', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        entityContext: { account: { id: 'from-entity-context' } },
        accountId: 'from-account-id',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-entity-context' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'from-account-id',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-account-id' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-core-account-id' });
  });

  it('uses a valid matching account path only as the final account fallback', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'root:orgs:showroom:ig-1',
      }),
    ).toMatchObject({ account: 'ig-1' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'root:orgs:another-org:ig-1',
      }),
    ).not.toHaveProperty('account');
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'ig-1',
      }),
    ).toMatchObject({
      account: 'ig-1',
      accountPath: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
  });

  it('uses the observed Account entity shape as a bounded fallback', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        entityKind: 'Account',
        entityName: 'ig-1',
      }),
    ).toMatchObject({
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
  });

  it('does not derive a workspace path from invalid workspace segments', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'not/a/workspace',
      }),
    ).not.toHaveProperty('workspacePath');
  });

  it('narrows sparse navigation context instead of retaining a stale account', () => {
    expect(
      mergePersistentPanelTargets(
        {
          organization: 'org-a',
          account: 'team-a',
          accountPath: 'root:orgs:org-a:team-a',
          namespace: 'apps',
        },
        { organization: 'org-a' },
      ),
    ).toEqual({ organization: 'org-a' });
  });

  it('drops stale account context when navigation crosses account boundaries', () => {
    expect(
      mergePersistentPanelTargets(
        {
          organization: 'org-a',
          account: 'team-a',
          namespace: 'apps',
          resource: { kind: 'Database', name: 'old' },
        },
        { organization: 'org-a', account: 'team-b' },
      ),
    ).toEqual({ organization: 'org-a', account: 'team-b' });
  });

  it('drops stale resource context when navigation returns to an account', () => {
    expect(
      mergePersistentPanelTargets(
        {
          organization: 'org-a',
          account: 'team-a',
          namespace: 'apps',
          resource: { kind: 'Database', name: 'old' },
        },
        { organization: 'org-a', account: 'team-a' },
      ),
    ).toEqual({ organization: 'org-a', account: 'team-a' });
  });
});
