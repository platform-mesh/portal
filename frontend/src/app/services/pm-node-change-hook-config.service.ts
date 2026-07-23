import { PersistentPanelService } from './persistent-panel/persistent-panel.service';
import {
  mergePersistentPanelTargets,
  persistentPanelTarget,
} from './persistent-panel/persistent-panel.types';
import { Injectable, inject } from '@angular/core';
import {
  LuigiCoreService,
  LuigiNode,
  NodeChangeHookConfigService,
  NodeContext,
} from '@openmfp/portal-ui-lib';
import { NodeChangeHookConfigServiceImpl } from '@platform-mesh/portal-ui-lib/portal-options';

type PlatformMeshNode = Parameters<
  NodeChangeHookConfigServiceImpl['nodeChangeHook']
>[0];

@Injectable({ providedIn: 'root' })
export class PMNodeChangeHookConfigService implements NodeChangeHookConfigService {
  private readonly delegate = inject(NodeChangeHookConfigServiceImpl);
  private readonly luigiCoreService = inject(LuigiCoreService);
  private readonly persistentPanelService = inject(PersistentPanelService);

  async nodeChangeHook(
    previousNode: LuigiNode,
    nextNode: LuigiNode,
    currentContext: NodeContext,
  ): Promise<void> {
    await this.delegate.nodeChangeHook(
      previousNode as PlatformMeshNode,
      nextNode as PlatformMeshNode,
      currentContext,
    );
    this.persistentPanelService.updateTarget(
      mergePersistentPanelTargets(
        this.persistentPanelService.currentTarget(),
        persistentPanelTarget(this.luigiCoreService.getGlobalContext(), {
          ...currentContext,
          ...(nextNode.context ?? {}),
        }),
      ),
    );
  }
}
