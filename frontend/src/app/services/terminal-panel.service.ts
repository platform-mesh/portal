import {
  Injectable,
  inject,
  ApplicationRef,
  createComponent,
  ComponentRef,
  EnvironmentInjector,
} from '@angular/core';
import { TerminalPanelComponent } from '../components/terminal-panel/terminal-panel';

@Injectable({ providedIn: 'root' })
export class TerminalPanelService {
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  private terminalPanelRef: ComponentRef<TerminalPanelComponent> | null = null;

  toggleTerminal(): void {
    if (!this.terminalPanelRef) {
      this.createTerminalPanel();
    }

    this.terminalPanelRef?.instance.open();
  }

  destroyTerminalPanel(): void {
    if (this.terminalPanelRef) {
      this.appRef.detachView(this.terminalPanelRef.hostView);
      this.terminalPanelRef.destroy();
      this.terminalPanelRef = null;
    }
  }

  private createTerminalPanel(): void {
    this.terminalPanelRef = createComponent(TerminalPanelComponent, {
      environmentInjector: this.environmentInjector,
    });

    this.appRef.attachView(this.terminalPanelRef.hostView);

    const domElem = this.terminalPanelRef.location.nativeElement as HTMLElement;
    document.body.appendChild(domElem);
  }
}
