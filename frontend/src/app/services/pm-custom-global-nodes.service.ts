import { Injectable, inject } from '@angular/core';
import { LuigiNode } from '@openmfp/portal-ui-lib';
import { TerminalPanelService } from './terminal-panel.service';

@Injectable({ providedIn: 'root' })
export class PMCustomGlobalNodesService {
  private terminalPanelService = inject(TerminalPanelService);

  async getCustomGlobalNodes(): Promise<LuigiNode[]> {
    return [
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
