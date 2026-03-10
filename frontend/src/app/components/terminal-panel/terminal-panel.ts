import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  inject,
  signal,
  effect,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Terminal } from '@xterm/xterm';
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
  encapsulation: ViewEncapsulation.None,
  templateUrl: './terminal-panel.html',
  styleUrls: ['./terminal-panel.scss'],
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
      scrollback: 10000,
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

    // Debounce resize to avoid excessive updates
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        this.fitTerminal();
        if (this.xterm) {
          this.webSocketService.sendResize(this.xterm.cols, this.xterm.rows);
        }
      }, 100);
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

      // Send resize after connection to ensure server has correct dimensions
      setTimeout(() => {
        if (this.xterm && this.fitAddon) {
          this.fitAddon.fit();
          this.webSocketService.sendResize(this.xterm.cols, this.xterm.rows);
        }
      }, 1000);
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
