import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Subscription, firstValueFrom } from 'rxjs';
import { TerminalService } from '../../services/terminal/terminal.service';
import {
  TerminalWebSocketService,
  WebSocketState,
} from '../../services/terminal/terminal-websocket.service';
import {
  Terminal as TerminalResource,
  TerminalPanelState,
} from '../../services/terminal/terminal.types';

@Component({
  selector: 'pm-terminal-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="terminal-panel"
      [class.open]="panelState() !== 'hidden'"
      [class.collapsed]="panelState() === 'collapsed'"
      [class.maximized]="panelState() === 'maximized'"
    >
      <div class="terminal-panel-header">
        <div class="header-left">
          @if (panelState() === 'collapsed') {
            <button
              class="icon-button"
              (click)="expand()"
              title="Expand terminal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 4l4 4H4l4-4z" />
              </svg>
            </button>
          } @else {
            <button
              class="icon-button"
              (click)="collapse()"
              title="Collapse terminal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 12l-4-4h8l-4 4z" />
              </svg>
            </button>
          }
          <span class="title">Terminal</span>
          @if (connectionStatus()) {
            <span class="status-badge" [class]="connectionStatus()">
              {{ connectionStatus() }}
            </span>
          }
        </div>
        <div class="header-right">
          @if (panelState() !== 'collapsed') {
            <button
              class="icon-button"
              (click)="cycleSize()"
              title="Toggle size"
            >
              @if (panelState() === 'maximized') {
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path
                    d="M3 5v6h10V5H3zm9 5H4V6h8v4zM2 4h12v8H2V4z"
                    fill-rule="evenodd"
                  />
                </svg>
              } @else {
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z" />
                </svg>
              }
            </button>
          }
          <button
            class="icon-button close-button"
            (click)="close()"
            title="Close terminal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                d="M8 7.293l3.146-3.147.708.708L8.707 8l3.147 3.146-.708.708L8 8.707l-3.146 3.147-.708-.708L7.293 8 4.146 4.854l.708-.708L8 7.293z"
              />
            </svg>
          </button>
        </div>
      </div>
      @if (panelState() !== 'collapsed') {
        <div class="terminal-panel-content">
          @if (loading()) {
            <div class="loading-overlay">
              <div class="loading-spinner"></div>
              <span>Starting terminal...</span>
            </div>
          }
          @if (error()) {
            <div class="error-overlay">
              <span>{{ error() }}</span>
              <button class="retry-button" (click)="retry()">Retry</button>
            </div>
          }
          <div #terminalContainer class="terminal-container"></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .terminal-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50vh;
        transform: translateY(100%);
        transition:
          transform 0.3s ease-out,
          height 0.2s ease;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        background: #1e1e1e;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        border-top: 1px solid #444;
      }

      .terminal-panel.open {
        transform: translateY(0);
      }

      .terminal-panel.collapsed {
        height: 40px;
      }

      .terminal-panel.maximized {
        height: 80vh;
      }

      .terminal-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #2d2d2d;
        border-bottom: 1px solid #444;
        min-height: 40px;
        flex-shrink: 0;
      }

      .header-left,
      .header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .title {
        color: #e0e0e0;
        font-size: 14px;
        font-weight: 500;
      }

      .status-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: capitalize;
      }

      .status-badge.connecting,
      .status-badge.authenticating {
        background: #f57c00;
        color: #fff;
      }

      .status-badge.connected {
        background: #388e3c;
        color: #fff;
      }

      .status-badge.disconnected,
      .status-badge.error {
        background: #d32f2f;
        color: #fff;
      }

      .icon-button {
        background: transparent;
        border: none;
        color: #b0b0b0;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .icon-button:hover {
        background: #444;
        color: #fff;
      }

      .close-button:hover {
        background: #d32f2f;
      }

      .terminal-panel-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .terminal-container {
        height: 100%;
        padding: 8px;
      }

      .loading-overlay,
      .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(30, 30, 30, 0.95);
        color: #e0e0e0;
        gap: 16px;
        z-index: 10;
      }

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #444;
        border-top-color: #0078d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .retry-button {
        padding: 8px 16px;
        background: #0078d4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .retry-button:hover {
        background: #006cbd;
      }
    `,
  ],
})
export class TerminalPanelComponent implements OnDestroy {
  @ViewChild('terminalContainer') terminalContainer!: ElementRef<HTMLDivElement>;

  private terminalService = inject(TerminalService);
  private webSocketService = inject(TerminalWebSocketService);

  panelState = signal<TerminalPanelState>('hidden');
  loading = signal(false);
  error = signal<string | null>(null);
  connectionStatus = signal<string | null>(null);

  private xterm: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private currentTerminal: TerminalResource | null = null;
  private subscriptions: Subscription[] = [];
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      if (this.panelState() === 'expanded' || this.panelState() === 'maximized') {
        setTimeout(() => this.fitTerminal(), 50);
      }
    });

    this.subscriptions.push(
      this.webSocketService.state$.subscribe((state: WebSocketState) => {
        this.connectionStatus.set(state.status);
        if (state.status === 'error' && state.error) {
          this.error.set(state.error);
        }
      })
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.cleanup();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async open(): Promise<void> {
    if (this.panelState() !== 'hidden') {
      this.panelState.set('expanded');
      return;
    }

    this.panelState.set('expanded');
    this.loading.set(true);
    this.error.set(null);

    await this.initializeTerminal();
  }

  close(): void {
    this.cleanup();
    this.panelState.set('hidden');
  }

  expand(): void {
    this.panelState.set('expanded');
  }

  collapse(): void {
    this.panelState.set('collapsed');
  }

  cycleSize(): void {
    if (this.panelState() === 'maximized') {
      this.panelState.set('expanded');
    } else {
      this.panelState.set('maximized');
    }
  }

  retry(): void {
    this.error.set(null);
    this.initializeTerminal();
  }

  private async initializeTerminal(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.waitForContainer();
      this.setupXterm();
      await this.createAndConnectTerminal();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to initialize terminal';
      this.error.set(message);
      this.loading.set(false);
    }
  }

  private waitForContainer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxAttempts = 20;
      let attempts = 0;

      const check = () => {
        if (this.terminalContainer?.nativeElement) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 50);
        } else {
          reject(new Error('Terminal container not available'));
        }
      };

      check();
    });
  }

  private setupXterm(): void {
    if (this.xterm) {
      this.xterm.dispose();
    }

    this.xterm = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
        selectionBackground: '#444444',
      },
    });

    this.fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    this.xterm.loadAddon(this.fitAddon);
    this.xterm.loadAddon(webLinksAddon);

    this.xterm.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.xterm.onData((data) => {
      this.webSocketService.send(data);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.fitTerminal();
      if (this.xterm) {
        this.webSocketService.sendResize(this.xterm.cols, this.xterm.rows);
      }
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);
  }

  private async createAndConnectTerminal(): Promise<void> {
    const terminal = await this.terminalService.getOrCreateTerminal();
    this.currentTerminal = terminal;

    this.xterm?.writeln('Waiting for terminal to be ready...');

    const readyTerminal = await firstValueFrom(
      this.terminalService.waitForTerminalReady(terminal.metadata.name)
    );

    const sessionId = readyTerminal.status?.sessionId;
    if (!sessionId) {
      throw new Error('Terminal ready but no sessionId');
    }

    this.xterm?.clear();

    if (this.xterm) {
      this.webSocketService.connect(sessionId, this.xterm);
    }

    this.loading.set(false);
  }

  private fitTerminal(): void {
    if (this.fitAddon && this.xterm) {
      try {
        this.fitAddon.fit();
      } catch {
        // ignore fit errors during transitions
      }
    }
  }

  private cleanup(): void {
    this.webSocketService.disconnect();

    if (this.currentTerminal) {
      this.terminalService.deleteTerminal(this.currentTerminal.metadata.name);
      this.currentTerminal = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.xterm) {
      this.xterm.dispose();
      this.xterm = null;
      this.fitAddon = null;
    }

    this.connectionStatus.set(null);
    this.loading.set(false);
    this.error.set(null);
  }

  private handleBeforeUnload = (): void => {
    if (this.currentTerminal) {
      this.terminalService.deleteTerminal(this.currentTerminal.metadata.name);
    }
  };
}
