import { discardDeliveredMeasures } from '../platform/performance';
import type { ErrorSource } from '../platform/logging';
import type { DiagnosticsLifecycle, LifecycleOptions, Renderer } from './types';

export const createLifecycle = ({ logger, writeError, exit, timeoutMs = 1500 }: LifecycleOptions) => {
    const stopTimingCleanup = discardDeliveredMeasures();
    let renderer: Renderer | undefined;
    let diagnostics: DiagnosticsLifecycle | undefined;
    let cleanup: (() => Promise<void>) | undefined;
    let shutdown: Promise<void> | undefined;
    let failed = false;
    let reportedFatal = false;

    const seen = new WeakSet<object>();

    const firstReport = (error: unknown) => {
        if ((typeof error !== 'object' || error === null) && typeof error !== 'function') return true;
        if (seen.has(error)) return false;

        seen.add(error);
        return true;
    };

    const reportUI = (error: unknown) => {
        failed = true;
        if (firstReport(error)) logger.log('ui.failed', 'react', error);
    };

    const stop = () => {
        if (shutdown) return shutdown;
        // Defer cleanup out of React commits and OpenTUI event/paint callbacks.
        shutdown = Promise.resolve().then(async () => {
            let timer: ReturnType<typeof setTimeout> | undefined;

            try {
                const restored = await Promise.race([
                    Promise.resolve().then(async () => {
                        if (renderer && !renderer.isDestroyed) renderer.destroy();

                        await renderer?.closed;
                        return true;
                    }),

                    new Promise<boolean>((resolve) => {
                        timer = setTimeout(() => resolve(false), timeoutMs);
                    }),
                ]);
                if (!restored) {
                    failed = true;
                    logger.log('shutdown.failed', 'shutdown');
                }
            } catch (error) {
                failed = true;
                logger.log('shutdown.failed', 'shutdown', error);
            } finally {
                clearTimeout(timer);
                stopTimingCleanup();
            }

            if (cleanup) {
                try {
                    await Promise.race([
                        cleanup(),
                        new Promise<never>((_resolve, reject) => {
                            timer = setTimeout(() => reject(new Error('Session cleanup timeout.')), timeoutMs);
                        }),
                    ]);
                } catch (error) {
                    failed = true;
                    logger.log('shutdown.failed', 'shutdown', error);
                } finally {
                    clearTimeout(timer);
                }
            }

            if (diagnostics) {
                const abort = new AbortController();

                try {
                    diagnostics.stop();

                    await Promise.race([
                        diagnostics.finalize(abort.signal),

                        new Promise<never>((_resolve, reject) => {
                            timer = setTimeout(() => {
                                abort.abort();
                                reject(new Error('Diagnostic report timeout.'));
                            }, timeoutMs);
                        }),
                    ]);
                } catch {
                    writeError(
                        'Pond could not finish its diagnostic report. Check .profiles permissions and disk space.\n'
                    );
                } finally {
                    clearTimeout(timer);
                }
            }

            logger.log('app.stopped');
            const flushed = await logger.flush(timeoutMs);

            if (failed) {
                writeError(
                    `Pond stopped after an unexpected error. Pending edits were not saved.\n${flushed ? `Log: ${logger.path}` : 'The error log could not be fully written.'}\n`
                );
            } else if (!flushed) {
                writeError(
                    'Pond could not write its local log. Check your log directory permissions and disk space.\n'
                );
            }
            exit(failed ? 1 : 0);
        });

        return shutdown;
    };

    const fatal = (error: unknown, source: ErrorSource) => {
        failed = true;
        if (!reportedFatal) {
            reportedFatal = true;

            if (firstReport(error)) logger.log('app.fatal', source, error);
        }

        return stop();
    };

    const consoleError = (...args: unknown[]) => {
        const error = args.find((value) => value instanceof Error);

        // React reports caught errors to console before componentDidCatch runs.
        queueMicrotask(() => {
            if (error && !seen.has(error)) void fatal(error, 'console');
            else if (!error) logger.log('runtime.error', 'console');
        });
    };

    return {
        attachCleanup: (value: () => Promise<void>) => {
            cleanup = value;
        },
        attachDiagnostics: (value: DiagnosticsLifecycle) => {
            diagnostics = value;
        },
        attach: (value: Renderer) => {
            renderer = value;
        },
        stop,
        fatal,
        reportUI,
        consoleError,
    };
};
