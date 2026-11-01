import type { createLogger } from './logger';

export type LogEvent =
    'app.started' | 'app.stopped' | 'app.fatal' | 'ui.failed' | 'runtime.error' | 'runtime.warning' | 'shutdown.failed';

export type ErrorSource =
    'bootstrap' | 'react' | 'renderer' | 'input' | 'uncaughtException' | 'unhandledRejection' | 'console' | 'shutdown';

export type Logger = ReturnType<typeof createLogger>;

export type LoggerOptions = {
    version: string;
    directory?: string;
    maxBytes?: number;
    maxQueued?: number;
};

export type SafeError = { name: string; code?: string; frames?: string[]; cause?: SafeError };
