import { writeSync } from 'node:fs';
import { version } from '../../package.json';
import { createLogger } from '../platform/logging';
import { diagnosticsRendererOptions } from '../platform/performance';
import { createLifecycle } from './lifecycle';

const logger = createLogger({ version });
const lifecycle = createLifecycle({
    logger,
    writeError: (message) => {
        try {
            writeSync(2, message);
        } catch {
            /* stderr may be closed. */
        }
    },
    exit: (code) => process.exit(code),
});

const onException = (error: unknown) => {
    void lifecycle.fatal(error, 'uncaughtException');
};
const onRejection = (error: unknown) => {
    void lifecycle.fatal(error, 'unhandledRejection');
};
const onSignal = () => {
    void lifecycle.stop();
};
process.on('uncaughtException', onException);
process.on('unhandledRejection', onRejection);
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

// Capture the upstream error channel without writing raw messages or database values.
console.error = lifecycle.consoleError;
console.warn = () => logger.log('runtime.warning', 'console');

try {
    const { createCliRenderer } = await import('@opentui/core');
    const { createRoot } = await import('@opentui/react');
    const { App } = await import('./App');
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const renderer = await createCliRenderer({
        ...diagnosticsRendererOptions(process.env.POND_DIAGNOSTICS),
        exitOnCtrlC: true,
        exitSignals: [],
        openConsoleOnError: false,
        consoleMode: 'disabled',
    });
    lifecycle.attach(renderer);
    renderer.on('render:error', ({ error }) => {
        void lifecycle.fatal(error, 'renderer');
    });
    renderer.on('handler:error', ({ error }) => {
        void lifecycle.fatal(error, 'input');
    });
    renderer.once('destroy', () => {
        void lifecycle.stop();
    });
    createRoot(renderer).render(
        <ErrorBoundary onError={lifecycle.reportUI} logPath={logger.path}>
            <App onError={lifecycle.reportUI} logPath={logger.path} />
        </ErrorBoundary>
    );
    logger.log('app.started');
} catch (error) {
    await lifecycle.fatal(error, 'bootstrap');
}
