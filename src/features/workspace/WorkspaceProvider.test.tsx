import { expect, test } from 'bun:test';
import { act } from 'react';
import { testRender } from '@opentui/react/test-utils';

import { createWorkspaceStore } from '../../state/workspace';
import { WorkspaceProvider, useWorkspace } from './WorkspaceProvider';

test('subscribers only render when their selected state changes', async () => {
    const store = createWorkspaceStore('members');
    let renders = 0;
    const ActiveTable = () => {
        const tableId = useWorkspace((state) => state.activeTableId);
        renders++;
        return <text>{tableId}</text>;
    };
    const view = await testRender(
        <WorkspaceProvider store={store}>
            <ActiveTable />
        </WorkspaceProvider>,
        { width: 40, height: 10 }
    );

    try {
        await view.renderOnce();
        const initialRenders = renders;
        expect(view.captureCharFrame()).toContain('members');

        await act(async () => store.getState().focusPanel('explorer'));
        await view.renderOnce();
        expect(renders).toBe(initialRenders);

        await act(async () => store.getState().openTable('events'));
        await view.renderOnce();
        expect(renders).toBeGreaterThan(initialRenders);
        expect(view.captureCharFrame()).toContain('events');
    } finally {
        await act(async () => view.dispose());
    }
});
