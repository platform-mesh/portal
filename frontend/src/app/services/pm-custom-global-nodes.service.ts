import { TerminalPanelService } from './terminal-panel.service';
import { Injectable, inject } from '@angular/core';
import { LuigiNode } from '@openmfp/portal-ui-lib';
import { CustomGlobalNodesServiceImpl } from '@platform-mesh/portal-ui-lib/portal-options';

@Injectable({ providedIn: 'root' })
export class PMCustomGlobalNodesService {
  private terminalPanelService = inject(TerminalPanelService);
  private customGlobalNodesServiceImpl = inject(CustomGlobalNodesServiceImpl);

  async getCustomGlobalNodes(): Promise<LuigiNode[]> {
    const nodes =
      await this.customGlobalNodesServiceImpl.getCustomGlobalNodes();
    return [
      ...nodes,
      // Terminal node in global top nav
      {
        pathSegment: 'terminal',
        label: 'Terminal',
        icon: 'command-line-interfaces',
        hideFromNav: false,
        globalNav: true,
        visibleForFeatureToggles: ['terminal'],
        order: 900,
        context: {} as any,
        onNodeActivation: () => {
          this.terminalPanelService.toggleTerminal();
          return false; // Prevent navigation
        },
      },
    ];
  }
}
