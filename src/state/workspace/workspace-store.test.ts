import { describe, expect, test } from 'bun:test';

import { createWorkspaceStore } from './workspace-store';

describe('workspace store', () => {
    test('opens a table and focuses its grid in one notification', () => {
        const store = createWorkspaceStore('members');
        store.getState().focusPanel('explorer');

        const updates: unknown[] = [];
        const unsubscribe = store.subscribe((state) => {
            updates.push({ activeTableId: state.activeTableId, focus: state.focus });
        });

        store.getState().openTable('events');
        unsubscribe();

        expect(updates).toEqual([{ activeTableId: 'events', focus: 'grid' }]);
    });

    test('focus changes preserve the open table and use the latest state', () => {
        const store = createWorkspaceStore('members');
        const { toggleFocus, focusPanel } = store.getState();

        toggleFocus();
        expect(store.getState().focus).toBe('explorer');
        toggleFocus();
        expect(store.getState().focus).toBe('grid');
        focusPanel('explorer');
        expect(store.getState().activeTableId).toBe('members');
    });

    test('workspace instances do not share state', () => {
        const first = createWorkspaceStore('members');
        const second = createWorkspaceStore();

        first.getState().openTable('events');
        first.getState().focusPanel('explorer');

        expect(second.getState().activeTableId).toBeNull();
        expect(second.getState().focus).toBe('grid');
    });
});
