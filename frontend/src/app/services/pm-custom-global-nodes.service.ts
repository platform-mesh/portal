import {
  Injectable,
  inject,
  ApplicationRef,
  createComponent,
  ComponentRef,
  EnvironmentInjector,
} from '@angular/core';
import { LuigiNode } from '@openmfp/portal-ui-lib';
import { TerminalPanelComponent } from '../components/terminal-panel/terminal-panel';

@Injectable({ providedIn: 'root' })
export class PMCustomGlobalNodesService {
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  private terminalPanelRef: ComponentRef<TerminalPanelComponent> | null = null;

  async getCustomGlobalNodes(): Promise<LuigiNode[]> {
    return [
      // Terminal node in global top nav
      {
        pathSegment: 'terminal',
        label: 'Terminal',
        icon: 'command-line-interfaces',
        hideFromNav: false,
        globalNav: true,
        order: 900,
        context: {} as any,
        onNodeActivation: () => {
          this.toggleTerminal();
          return false; // Prevent navigation
        },
      },
    ];
  }

  private toggleTerminal(): void {
    if (!this.terminalPanelRef) {
      this.createTerminalPanel();
    }

    this.terminalPanelRef?.instance.open();
  }

  private createTerminalPanel(): void {
    this.terminalPanelRef = createComponent(TerminalPanelComponent, {
      environmentInjector: this.environmentInjector,
    });

    this.appRef.attachView(this.terminalPanelRef.hostView);

    const domElem = this.terminalPanelRef.location.nativeElement as HTMLElement;
    document.body.appendChild(domElem);
  }

  destroyTerminalPanel(): void {
    if (this.terminalPanelRef) {
      this.appRef.detachView(this.terminalPanelRef.hostView);
      this.terminalPanelRef.destroy();
      this.terminalPanelRef = null;
    }
  }
}
