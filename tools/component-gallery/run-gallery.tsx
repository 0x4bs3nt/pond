import { writeSync } from 'node:fs';
import { version } from '../../package.json';
import { createLifecycle, ErrorBoundary } from '../../src/app';
import { createLogger } from '../../src/platform/logging';
import { diagnosticsRendererOptions } from '../../src/platform/performance';
import { theme } from '../../src/theme';
import { palettes } from './palettes';

export const runGallery = async (initialScenario: string, palette: string) => {
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
    process.on('uncaughtException', (error) => {
        void lifecycle.fatal(error, 'uncaughtException');
    });
    process.on('unhandledRejection', (error) => {
        void lifecycle.fatal(error, 'unhandledRejection');
    });
    process.on('SIGINT', () => {
        void lifecycle.stop();
    });
    process.on('SIGTERM', () => {
        void lifecycle.stop();
    });
    console.error = lifecycle.consoleError;
    console.warn = () => logger.log('runtime.warning', 'console');

    try {
        // Only this standalone process sees the preview palette; nothing is saved.
        Object.assign(theme, palettes[palette]);
        const { createCliRenderer } = await import('@opentui/core');
        const { createRoot } = await import('@opentui/react');
        const { Gallery } = await import('./Gallery');
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
                <Gallery initialScenario={initialScenario} palette={palette} />
            </ErrorBoundary>
        );
        logger.log('app.started');
    } catch (error) {
        await lifecycle.fatal(error, 'bootstrap');
    }
};
