import { expect, spyOn, test } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import { createDiagnosticsSession } from '../index';

test('repeated sessions release every timer and listener and omit arbitrary environment values', async () => {
    const view = await createTestRenderer({ width: 20, height: 5 });
    const events = ['frame', 'resize', 'destroy'] as const;
    const baseline = events.map((event) => view.renderer.listenerCount(event));
    const baselineKeys = view.renderer.keyInput.listenerCount('keypress');
    const intervals = spyOn(globalThis, 'setInterval');
    const clear = spyOn(globalThis, 'clearInterval');
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'SECRET-ENVIRONMENT-VALUE';
    try {
        for (let index = 0; index < 10; index++) {
            intervals.mockClear();
            clear.mockClear();
            const session = createDiagnosticsSession(view.renderer, {
                appVersion: 'test',
                source: 'app',
                startedAtMs: performance.now(),
            });
            session.begin('navigation');
            session.stop();
            session.stop();
            for (const result of intervals.mock.results) expect(clear).toHaveBeenCalledWith(result.value);
            expect(events.map((event) => view.renderer.listenerCount(event))).toEqual(baseline);
            expect(view.renderer.keyInput.listenerCount('keypress')).toBe(baselineKeys);
            const stopped = session.snapshot();
            expect(stopped.interactions.pending).toBe(0);
            expect(stopped.interactions.abandoned).toBe(1);
            expect(stopped.metadata.nodeEnv).toBe('other');
            expect(JSON.stringify(stopped)).not.toContain('SECRET');
            view.mockInput.pressArrow('down');
            await view.renderOnce();
            expect(session.snapshot()).toEqual(stopped);
        }
    } finally {
        intervals.mockRestore();
        clear.mockRestore();
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
        await view.dispose();
    }
});
