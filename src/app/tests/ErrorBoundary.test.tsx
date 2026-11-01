import { testRender } from '@opentui/react/test-utils';
import { expect, spyOn, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { act } from 'react';
import { createLogger } from '../../platform/logging';
import { createTableSessionsStore } from '../../state/table-sessions';
import { ErrorBoundary } from '../ErrorBoundary';
import { createLifecycle } from '../lifecycle';

test('a real React render failure shows an exit fallback, retains external edits, and logs once', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-boundary-'));
    const logger = createLogger({ version: 'test', directory });
    const exits: number[] = [];
    const lifecycle = createLifecycle({ logger, writeError: () => {}, exit: (code) => exits.push(code) });
    const consoleError = spyOn(console, 'error').mockImplementation(lifecycle.consoleError);
    const sessions = createTableSessionsStore();
    sessions.getState().stage('table', { rowId: '1', columnId: 'a', original: 'old', value: 'private cell' });
    const before = sessions.getState().changes;
    const failure = new Error('private cell');
    const Broken = () => {
        throw failure;
    };
    const view = await testRender(
        <ErrorBoundary onError={lifecycle.reportUI} logPath={logger.path}>
            <Broken />
        </ErrorBoundary>,
        { width: 120, height: 20, consoleMode: 'disabled' }
    );
    lifecycle.attach(view.renderer);
    view.renderer.once('destroy', () => {
        void lifecycle.stop();
    });
    try {
        await act(async () => {
            await view.renderOnce();
        });
        expect(view.captureCharFrame()).toContain('Pond encountered an unexpected error.');
        expect(view.captureCharFrame()).toContain('Press q or Ctrl+C to exit.');
        expect(view.captureCharFrame()).not.toContain('private cell');
        expect(sessions.getState().changes).toBe(before);
        expect(exits).toEqual([]);
        await act(async () => view.mockInput.pressKey('q'));
        await lifecycle.stop();
        expect(exits).toEqual([1]);
        const raw = await readFile(logger.path, 'utf8');
        expect(raw.match(/ui.failed/g)).toHaveLength(1);
        expect(raw).not.toContain('app.fatal');
        expect(raw).not.toContain('private cell');
    } finally {
        await act(async () => view.dispose());
        consoleError.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});
