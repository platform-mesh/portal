import { PersistentPanelComponent } from '../../components/persistent-panel/persistent-panel';
import {
  PersistentPanelConfig,
  PersistentPanelTarget,
} from './persistent-panel.types';
import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PersistentPanelService {
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private panelRef: ComponentRef<PersistentPanelComponent> | null = null;
  private target: PersistentPanelTarget = {};

  open(config: PersistentPanelConfig, target: PersistentPanelTarget): void {
    this.target = target;
    if (!this.panelRef) {
      this.panelRef = createComponent(PersistentPanelComponent, {
        environmentInjector: this.environmentInjector,
      });
      this.appRef.attachView(this.panelRef.hostView);
      document.body.appendChild(
        this.panelRef.location.nativeElement as HTMLElement,
      );
    }
    this.panelRef.instance.open(config, target);
  }

  updateTarget(target: PersistentPanelTarget): void {
    this.target = target;
    this.panelRef?.instance.updateTarget(target);
  }

  currentTarget(): PersistentPanelTarget {
    return structuredClone(this.target);
  }

  destroy(): void {
    if (this.panelRef) {
      this.appRef.detachView(this.panelRef.hostView);
      this.panelRef.destroy();
      this.panelRef = null;
    }
    this.target = {};
  }
}
