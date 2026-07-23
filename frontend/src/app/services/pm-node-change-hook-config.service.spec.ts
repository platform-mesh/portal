import { PersistentPanelService } from './persistent-panel/persistent-panel.service';
import { PMNodeChangeHookConfigService } from './pm-node-change-hook-config.service';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  LuigiCoreService,
  LuigiNode,
  NodeContext,
} from '@openmfp/portal-ui-lib';
import { NodeChangeHookConfigServiceImpl } from '@platform-mesh/portal-ui-lib/portal-options';
import { describe, expect, it, vi } from 'vitest';

describe('PMNodeChangeHookConfigService', () => {
  it('clears stale account scope when navigation returns to the organization', async () => {
    const delegate = {
      nodeChangeHook: vi
        .fn()
        .mockImplementation(
          async (_previousNode: LuigiNode, nextNode: LuigiNode) => {
            nextNode.context = {
              organization: 'showroom',
              entityId: 'parent/default',
            } as unknown as NodeContext;
          },
        ),
    };
    const luigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({ organization: 'showroom' }),
    };
    const persistentPanelService = {
      currentTarget: vi.fn().mockReturnValue({
        organization: 'showroom',
        account: 'ig-1',
        accountPath: 'root:orgs:showroom:ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
      }),
      updateTarget: vi.fn(),
    };
    const injector = Injector.create({
      providers: [
        { provide: NodeChangeHookConfigServiceImpl, useValue: delegate },
        { provide: LuigiCoreService, useValue: luigiCoreService },
        { provide: PersistentPanelService, useValue: persistentPanelService },
      ],
    });
    const service = runInInjectionContext(
      injector,
      () => new PMNodeChangeHookConfigService(),
    );

    await service.nodeChangeHook(
      { context: { accountId: 'stale' } } as unknown as LuigiNode,
      {} as LuigiNode,
      {
        organization: 'showroom',
        entityId: 'parent/default',
      } as unknown as NodeContext,
    );

    expect(persistentPanelService.updateTarget).toHaveBeenCalledWith({
      organization: 'showroom',
    });
  });

  it('preserves effective inherited scope when the next node context is sparse', async () => {
    const delegate = {
      nodeChangeHook: vi
        .fn()
        .mockImplementation(
          async (_previousNode: LuigiNode, nextNode: LuigiNode) => {
            nextNode.context = {
              navigationContext: 'resource-details',
            } as unknown as NodeContext;
          },
        ),
    };
    const luigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({ organization: 'showroom' }),
    };
    const persistentPanelService = {
      currentTarget: vi.fn().mockReturnValue({}),
      updateTarget: vi.fn(),
    };
    const injector = Injector.create({
      providers: [
        { provide: NodeChangeHookConfigServiceImpl, useValue: delegate },
        { provide: LuigiCoreService, useValue: luigiCoreService },
        { provide: PersistentPanelService, useValue: persistentPanelService },
      ],
    });
    const service = runInInjectionContext(
      injector,
      () => new PMNodeChangeHookConfigService(),
    );

    await service.nodeChangeHook(
      {} as LuigiNode,
      {} as LuigiNode,
      {
        organization: 'showroom',
        accountId: 'ig-1',
        kcpPath: 'root:orgs:showroom:ig-1',
        namespaceId: 'apps',
        entityKind: 'Database',
        entityName: 'sample',
      } as unknown as NodeContext,
    );

    expect(persistentPanelService.updateTarget).toHaveBeenCalledWith({
      organization: 'showroom',
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
      namespace: 'apps',
      resource: { kind: 'Database', name: 'sample' },
    });
  });
});
