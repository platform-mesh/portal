import {
  PROVIDER_PANEL_MESSAGE,
  PersistentPanelConfig,
  PersistentPanelTarget,
} from '../../services/persistent-panel/persistent-panel.types';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type PanelState = 'hidden' | 'expanded' | 'maximized';

@Component({
  selector: 'pm-persistent-panel',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './persistent-panel.html',
  styleUrl: './persistent-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersistentPanelComponent implements OnDestroy {
  @ViewChild('panelFrame') panelFrame?: ElementRef<HTMLIFrameElement>;

  readonly state = signal<PanelState>('hidden');
  readonly title = signal('');
  readonly source = signal<SafeResourceUrl | null>(null);
  readonly closing = signal(false);
  readonly closeError = signal('');

  private readonly sanitizer = inject(DomSanitizer);
  private config: PersistentPanelConfig | null = null;
  private target: PersistentPanelTarget = {};
  private sequence = 0;
  private closeSequence = 0;
  private closeTimeout: number | null = null;

  constructor() {
    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.clearCloseTimeout();
  }

  open(config: PersistentPanelConfig, target: PersistentPanelTarget): void {
    if (this.closing()) {
      this.closeSequence += 1;
    }
    this.clearCloseTimeout();
    this.closing.set(false);
    this.closeError.set('');
    const sourceChanged = this.config?.url !== config.url;
    this.config = config;
    this.target = structuredClone(target);
    this.title.set(config.title);
    if (sourceChanged || !this.source()) {
      this.source.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(config.url),
      );
    }
    this.state.set('expanded');
    queueMicrotask(() => {
      this.publishTarget();
    });
  }

  updateTarget(target: PersistentPanelTarget): void {
    this.target = structuredClone(target);
    this.publishTarget();
  }

  collapse(): void {
    this.state.set('hidden');
  }

  expand(): void {
    this.state.set('expanded');
  }

  toggleSize(): void {
    this.state.update((state) =>
      state === 'maximized' ? 'expanded' : 'maximized',
    );
  }

  close(): void {
    if (!this.source() || this.closing()) {
      return;
    }
    this.closeSequence += 1;
    const requestId = this.closeSequence;
    this.closing.set(true);
    this.closeError.set('');
    this.state.set('hidden');
    this.post({ type: PROVIDER_PANEL_MESSAGE.close, requestId });
    this.closeTimeout = window.setTimeout(() => {
      this.failClose(requestId);
    }, 30_000);
  }

  private failClose(requestId: number): void {
    if (!this.closing() || requestId !== this.closeSequence) {
      return;
    }
    this.clearCloseTimeout();
    this.closing.set(false);
    this.closeError.set('Sandbox cleanup is incomplete. Try closing again.');
    this.state.set('expanded');
  }

  private finishClose(requestId: number): void {
    if (!this.closing() || requestId !== this.closeSequence) {
      return;
    }
    this.clearCloseTimeout();
    this.closing.set(false);
    this.closeError.set('');
    this.config = null;
    this.source.set(null);
    this.title.set('');
    this.state.set('hidden');
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout !== null) {
      window.clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  frameLoaded(): void {
    this.publishTarget();
  }

  private publishTarget(): void {
    if (!this.config) {
      return;
    }
    this.sequence += 1;
    this.post({
      type: PROVIDER_PANEL_MESSAGE.context,
      panelId: this.config.id,
      sequence: this.sequence,
      target: this.target,
    });
  }

  private post(message: Record<string, unknown>): void {
    this.panelFrame?.nativeElement.contentWindow?.postMessage(
      message,
      this.config?.origin ?? window.location.origin,
    );
  }

  private readonly onMessage = (event: MessageEvent<unknown>): void => {
    const frame = this.panelFrame?.nativeElement;
    if (
      !frame ||
      event.source !== frame.contentWindow ||
      event.origin !== this.config?.origin ||
      !isRecord(event.data)
    ) {
      return;
    }
    if (event.data['type'] === PROVIDER_PANEL_MESSAGE.ready) {
      this.publishTarget();
    }
    if (event.data['type'] === PROVIDER_PANEL_MESSAGE.requestClose) {
      this.close();
    }
    if (
      event.data['type'] === PROVIDER_PANEL_MESSAGE.closeFailed &&
      typeof event.data['requestId'] === 'number'
    ) {
      this.failClose(event.data['requestId']);
    }
    if (
      event.data['type'] === PROVIDER_PANEL_MESSAGE.closed &&
      typeof event.data['requestId'] === 'number'
    ) {
      this.finishClose(event.data['requestId']);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
