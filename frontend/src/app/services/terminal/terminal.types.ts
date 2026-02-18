export type TerminalPhase =
  | 'Pending'
  | 'Creating'
  | 'Ready'
  | 'Failed'
  | 'Terminating';

export interface TerminalStatus {
  phase?: TerminalPhase;
  sessionId?: string;
  createdBy?: string;
  podName?: string;
  workspacePath?: string;
}

export interface TerminalMetadata {
  name: string;
  resourceVersion?: string;
}

export interface Terminal {
  apiVersion?: 'terminal.platform-mesh.io/v1alpha1';
  kind?: 'Terminal';
  metadata: TerminalMetadata;
  spec: Record<string, never>;
  status?: TerminalStatus;
}

export interface TerminalSubscriptionEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED';
  object: Terminal;
}

export type TerminalPanelState = 'hidden' | 'collapsed' | 'expanded' | 'maximized';
