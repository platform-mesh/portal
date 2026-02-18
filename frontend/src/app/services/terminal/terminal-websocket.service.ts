import { Injectable, inject, OnDestroy } from '@angular/core';
import { LuigiCoreService, AuthService, AuthEvent } from '@openmfp/portal-ui-lib';
import { Terminal as XTerm } from '@xterm/xterm';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'error';

export interface WebSocketState {
  status: WebSocketStatus;
  error?: string;
}

// ttyd protocol commands (server -> client)
const enum TtydServerCommand {
  OUTPUT = '0',
  SET_WINDOW_TITLE = '1',
  SET_PREFERENCES = '2',
}

// ttyd protocol commands (client -> server)
const enum TtydClientCommand {
  INPUT = '0',
  RESIZE_TERMINAL = '1',
}

@Injectable({ providedIn: 'root' })
export class TerminalWebSocketService implements OnDestroy {
  private luigiCoreService = inject(LuigiCoreService);
  private authService = inject(AuthService);

  private ws: WebSocket | null = null;
  private xterm: XTerm | null = null;
  private tokenSent = false;
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  private stateSubject = new Subject<WebSocketState>();
  state$ = this.stateSubject.asObservable();

  private connectAttempts = 0;
  private maxConnectAttempts = 3;
  private currentSessionId: string | null = null;

  private authSubscription: Subscription | null = null;
  private tokenSendTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  connect(sessionId: string, xterm: XTerm): void {
    if (this.ws) {
      this.disconnect();
    }

    this.xterm = xterm;
    this.tokenSent = false;
    this.connectAttempts = 0;
    this.currentSessionId = sessionId;

    // Subscribe to auth refresh events to update terminal token
    this.subscribeToAuthRefresh();

    this.attemptConnect(sessionId);
  }

  private subscribeToAuthRefresh(): void {
    this.authSubscription?.unsubscribe();

    this.authSubscription = this.authService.authEvents
      .pipe(filter((event) => event === AuthEvent.AUTH_REFRESHED))
      .subscribe(() => this.sendTokenUpdate());
  }

  private sendTokenUpdate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.tokenSent) {
      return;
    }

    const authData = this.luigiCoreService.getAuthData();
    const token = authData?.idToken;

    if (typeof token === 'string' && token.length > 0) {
      const command = `__update_token__ ${token}\n`;
      const payload = TtydClientCommand.INPUT + command;
      this.ws.send(this.textEncoder.encode(payload));
    }
  }

  private attemptConnect(sessionId: string): void {
    this.connectAttempts++;
    const wsUrl = this.buildWebSocketUrl(sessionId);
    this.stateSubject.next({ status: 'connecting' });

    try {
      // ttyd requires the "tty" subprotocol
      this.ws = new WebSocket(wsUrl, ['tty']);
      this.ws.binaryType = 'arraybuffer';
      this.setupWebSocketHandlers(sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      this.stateSubject.next({ status: 'error', error: message });
    }
  }

  disconnect(): void {
    this.authSubscription?.unsubscribe();
    this.authSubscription = null;

    if (this.tokenSendTimeout) {
      clearTimeout(this.tokenSendTimeout);
      this.tokenSendTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.xterm = null;
    this.tokenSent = false;
    this.stateSubject.next({ status: 'disconnected' });
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.tokenSent) {
      const payload = TtydClientCommand.INPUT + data;
      this.ws.send(this.textEncoder.encode(payload));
    }
  }

  sendResize(cols: number, rows: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.tokenSent) {
      const payload =
        TtydClientCommand.RESIZE_TERMINAL + JSON.stringify({ columns: cols, rows });
      this.ws.send(this.textEncoder.encode(payload));
    }
  }

  private buildWebSocketUrl(sessionId: string): string {
    const globalContext = this.luigiCoreService.getGlobalContext();
    const portalContext = globalContext['portalContext'] as
      | Record<string, string>
      | undefined;
    const baseUrl = portalContext?.['portalBaseUrl'] || window.location.origin;
    const wsBase = baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/terminals/${sessionId}/ws`;
  }

  private setupWebSocketHandlers(sessionId: string): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connectAttempts = 0;
      this.stateSubject.next({ status: 'authenticating' });

      const authData = this.luigiCoreService.getAuthData();
      const token = authData?.idToken;

      if (typeof token === 'string' && token.length > 0 && this.ws && this.xterm) {
        const authMessage = JSON.stringify({
          AuthToken: token,
          columns: this.xterm.cols,
          rows: this.xterm.rows,
        });
        this.ws.send(this.textEncoder.encode(authMessage));

        // After ttyd auth, send the token as input to setup.sh (which reads from stdin)
        // Small delay to ensure ttyd has processed auth and spawned the shell
        this.tokenSendTimeout = setTimeout(() => {
          this.tokenSendTimeout = null;
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const inputPayload = TtydClientCommand.INPUT + token + '\n';
            this.ws.send(this.textEncoder.encode(inputPayload));
            this.tokenSent = true;
            this.stateSubject.next({ status: 'connected' });
          }
        }, 100);
      } else {
        this.stateSubject.next({
          status: 'error',
          error: 'No authentication token available',
        });
        this.disconnect();
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (!this.xterm) {
        return;
      }

      const rawData = event.data as ArrayBuffer;
      const dataArray = new Uint8Array(rawData);

      if (dataArray.length === 0) {
        return;
      }

      const cmd = String.fromCharCode(dataArray[0]);
      const data = rawData.slice(1);

      switch (cmd) {
        case TtydServerCommand.OUTPUT:
          this.xterm.write(this.textDecoder.decode(data));
          break;
        case TtydServerCommand.SET_WINDOW_TITLE:
        case TtydServerCommand.SET_PREFERENCES:
          break;
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      // Retry on abnormal closure if we haven't exceeded max attempts
      if (
        event.code === 1006 &&
        this.connectAttempts < this.maxConnectAttempts &&
        this.currentSessionId === sessionId
      ) {
        this.ws = null;
        setTimeout(() => {
          if (this.currentSessionId === sessionId) {
            this.attemptConnect(sessionId);
          }
        }, 500);
        return;
      }

      const error = event.reason || 'Connection closed';
      this.stateSubject.next({ status: 'disconnected', error });
      this.ws = null;
      this.tokenSent = false;
    };

    this.ws.onerror = () => {
      // Don't set error state here - let onclose handle retry logic
    };
  }
}
