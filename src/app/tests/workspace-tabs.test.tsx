import { testRender } from '@opentui/react/test-utils';
import { expect, test } from 'bun:test';
import { act } from 'react';
import { WorkspaceProvider } from '../../features/workspace';
import { createTableSessionsStore } from '../../state/table-sessions';
import { createWorkspaceStore } from '../../state/workspace';
import { Workspace } from '../Workspace';

test('switching preserves pending edits and dirty close requires explicit discard', async () => {
    const store = createWorkspaceStore('members');
    const sessions = createTableSessionsStore();
    sessions
        .getState()
        .stage('members', { rowId: 'member-1', columnId: 'name', original: 'Mara Novak', value: 'Edited' });
    const view = await testRender(
        <WorkspaceProvider store={store}>
            <Workspace sessions={sessions} />
        </WorkspaceProvider>,
        { width: 100, height: 24 }
    );
    try {
        await view.renderOnce();
        await act(async () => view.mockMouse.click(10, 8));
        expect(store.getState().activeTableId).toBe('events');
        await view.renderOnce();
        await act(async () => view.mockMouse.click(30, 2));
        await view.renderOnce();
        expect(store.getState().activeTableId).toBe('members');
        expect(view.captureCharFrame()).toContain('Edited');
        expect(view.captureCharFrame()).toContain('*members');
        for (const [width, height] of [
            [60, 16],
            [40, 10],
            [100, 24],
        ]) {
            await act(async () => view.resize(width!, height!));
            await view.renderOnce();
        }
        expect(view.captureCharFrame()).toContain('Edited');
        expect(view.captureCharFrame()).toContain('*members');
        await act(async () => view.mockInput.pressKey('w', { ctrl: true }));
        await view.renderOnce();
        expect(store.getState().openTableIds).toEqual(['members', 'events']);
        expect(view.captureCharFrame()).toContain('Pending edits:');
        expect(store.getState().focus).toBe('grid');
        await act(async () => view.mockInput.pressKey('d', { ctrl: true }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Mara Novak');
        await act(async () => view.mockInput.pressKey('w', { ctrl: true }));
        await view.renderOnce();
        expect(store.getState().openTableIds).toEqual(['events']);
        expect(store.getState().activeTableId).toBe('events');
        await act(async () => view.mockInput.pressKey('w', { ctrl: true }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Open a table from the explorer.');
        expect(store.getState().focus).toBe('explorer');
        // Shrinking below the minimum remounts the explorer at its first table.
        await act(async () => view.mockInput.pressEnter());
        expect(store.getState().openTableIds).toEqual(['members']);
    } finally {
        await act(async () => view.dispose());
    }
});

test('editor owns keyboard and mouse focus until it is cancelled', async () => {
    const store = createWorkspaceStore('members');
    store.getState().openTable('events');
    store.getState().openTable('members');
    const sessions = createTableSessionsStore();
    const view = await testRender(
        <WorkspaceProvider store={store}>
            <Workspace sessions={sessions} />
        </WorkspaceProvider>,
        { width: 100, height: 24 }
    );
    try {
        await view.renderOnce();
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(store.getState().editing).toBe(true);
        await act(async () => {
            view.mockInput.pressKey('w', { ctrl: true });
            view.mockInput.pressTab();
            view.mockInput.pressArrow('right');
            view.mockMouse.click(50, 2);
            view.mockMouse.click(42, 2);
        });
        expect(store.getState().activeTableId).toBe('members');
        expect(store.getState().openTableIds).toEqual(['members', 'events']);
        expect(store.getState().focus).toBe('grid');
        await act(async () => view.mockInput.pressKey('\u001b[27u'));
        await view.renderOnce();
        expect(store.getState().editing).toBe(false);
        await act(async () => view.mockInput.pressTab({ shift: true }));
        await view.renderOnce();
        expect(store.getState().focus).toBe('tabs');
        await act(async () => view.mockInput.pressArrow('right'));
        await view.renderOnce();
        expect(store.getState().activeTableId).toBe('events');
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(store.getState().focus).toBe('grid');
        expect(store.getState().editing).toBe(false);
    } finally {
        await act(async () => view.dispose());
    }
});

test('overflow navigation reveals active tabs through resizing and mouse activation', async () => {
    const store = createWorkspaceStore('members');
    store.getState().openTable('events');
    store.getState().openTable('audit_log');
    store.getState().focusPanel('tabs');
    const sessions = createTableSessionsStore();
    const view = await testRender(
        <WorkspaceProvider store={store}>
            <Workspace sessions={sessions} />
        </WorkspaceProvider>,
        { width: 60, height: 16 }
    );
    try {
        await view.renderOnce();
        expect(view.captureCharFrame().split('\n')[2]).toContain('audit_log');
        await act(async () => view.mockInput.pressKey('HOME'));
        await view.renderOnce();
        expect(view.captureCharFrame().split('\n')[2]).toContain('members');
        await act(async () => view.mockMouse.click(42, 2));
        await view.renderOnce();
        expect(store.getState().activeTableId).toBe('events');
        expect(view.captureCharFrame().split('\n')[2]).toContain('events');
        await act(async () => view.resize(100, 24));
        await view.renderOnce();
        const bar = view.captureCharFrame().split('\n')[2];
        expect(bar).toContain('members');
        expect(bar).toContain('events');
        expect(bar).toContain('audit_log');
        await act(async () => view.mockInput.pressKey('END'));
        await act(async () => view.resize(60, 16));
        await view.renderOnce();
        expect(view.captureCharFrame().split('\n')[2]).toContain('audit_log');
        await act(async () => view.mockInput.pressKey('DELETE'));
        await view.renderOnce();
        expect(store.getState().activeTableId).toBe('events');
        expect(view.captureCharFrame().split('\n')[2]).toContain('events');
    } finally {
        await act(async () => view.dispose());
    }
});
