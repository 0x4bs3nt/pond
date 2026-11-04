import type { ReactNode } from 'react';
import type { Logger } from '../platform/logging';
import type { TableSessionsStore } from '../state/table-sessions';

export type AppProps = { onError?: (error: unknown) => void; logPath?: string };

export type WorkspaceProps = { sessions: TableSessionsStore };

export type ErrorBoundaryProps = { children: ReactNode; onError?: (error: unknown) => void; logPath?: string };

export type ErrorScreenProps = { logPath?: string };

export type ErrorBoundaryState = { failed: boolean };

export type Renderer = { destroy: () => void; readonly isDestroyed: boolean; readonly closed: Promise<void> };

export type LifecycleOptions = {
    logger: Logger;
    writeError: (message: string) => void;
    exit: (code: number) => void;
    timeoutMs?: number;
};

export type DiagnosticsLifecycle = {
    stop: () => void;
    finalize: (signal: AbortSignal) => Promise<void>;
};

export type LogsCommandOptions = { follow: boolean };
