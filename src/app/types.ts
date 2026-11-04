import type { ReactNode } from 'react';
import type { Logger } from '../platform/logging';
import type { TableSessionsStore } from '../state/table-sessions';
import type { TableView } from '../features/table-browser';
import type { ConnectionDependencies } from '../features/connection-manager';

export type AppProps = {
    tables: readonly TableView[];
    connectionDependencies?: ConnectionDependencies;
    onError?: (error: unknown) => void;
    logPath?: string;
};

export type WorkspaceProps = { tables: readonly TableView[]; sessions: TableSessionsStore; onConnections?: () => void };

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
