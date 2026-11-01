import { describe, expect, test } from 'bun:test';

import { createWorkspaceStore } from '../workspace-store';

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
        expect(store.getState().focus).toBe('tabs');
        toggleFocus();
        expect(store.getState().focus).toBe('grid');
        toggleFocus(true);
        expect(store.getState().focus).toBe('tabs');
        focusPanel('explorer');
        expect(store.getState().activeTableId).toBe('members');
    });

    test('workspace instances do not share state', () => {
        const first = createWorkspaceStore('members');
        const second = createWorkspaceStore();

        first.getState().openTable('events');
        first.getState().focusPanel('explorer');

        expect(second.getState().activeTableId).toBeNull();
        expect(second.getState().focus).toBe('explorer');
    });
});

test('deduplicates tabs and chooses a neighbor when the active tab closes', () => {
    const store = createWorkspaceStore('members');
    const state = store.getState();
    state.openTable('events');
    state.openTable('audit_log');
    state.openTable('events');
    expect(store.getState().openTableIds).toEqual(['members', 'events', 'audit_log']);
    state.closeTab('events');
    expect(store.getState().activeTableId).toBe('audit_log');
    state.closeTab('members');
    expect(store.getState().activeTableId).toBe('audit_log');
    state.closeTab('audit_log');
    expect(store.getState().openTableIds).toEqual([]);
    expect(store.getState().activeTableId).toBeNull();
    expect(store.getState().focus).toBe('explorer');
    state.toggleFocus();
    expect(store.getState().focus).toBe('tabs');
    state.toggleFocus();
    expect(store.getState().focus).toBe('explorer');
    state.openTable('members');
    expect(store.getState().focus).toBe('grid');
});

test('editing blocks tab mutations and focus changes, including stale tab requests', () => {
    const store = createWorkspaceStore('members');
    const state = store.getState();
    state.openTable('events');
    state.setEditing(true);
    state.openTable('audit_log');
    state.activateTab('members');
    state.closeTab('events');
    state.toggleFocus();
    state.focusPanel('tabs');
    expect(store.getState().openTableIds).toEqual(['members', 'events']);
    expect(store.getState().activeTableId).toBe('events');
    expect(store.getState().focus).toBe('grid');
    state.setEditing(false);
    state.activateTab('missing');
    state.closeTab('missing');
    expect(store.getState().activeTableId).toBe('events');
});
