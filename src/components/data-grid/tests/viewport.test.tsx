import { testRender } from '@opentui/react/test-utils';
import type { BaseRenderable } from '@opentui/core';
import { expect, test } from 'bun:test';
import { act, useState } from 'react';
import { DataGrid } from '../DataGrid';
import type { CellPosition } from '../types';

const countNodes = (node: BaseRenderable): number =>
    1 + node.getChildren().reduce((sum, child) => sum + countNodes(child), 0);

test('large-grid scrolling reuses a bounded viewport with correct text, row numbers, and mouse targets', async () => {
    const columns = Array.from({ length: 100 }, (_, index) => ({
        id: `c${index}`,
        name: `C${index}`,
        type: 'text',
        width: 12,
    }));
    const cells = columns.map((column) => column.name);
    const rows = Array.from({ length: 10_000 }, (_, index) => ({ id: String(index), cells }));
    let lastSelection: CellPosition = { row: 0, column: 0 };
    const Harness = () => {
        const [selection, setSelection] = useState(lastSelection);
        return (
            <DataGrid
                columns={columns}
                rows={rows}
                width={80}
                height={14}
                selection={selection}
                onSelect={(value) => {
                    lastSelection = value;
                    setSelection(value);
                }}
                getInteraction={() => 'focused'}
                onFocus={() => {}}
            />
        );
    };
    const view = await testRender(<Harness />, { width: 80, height: 14 });
    try {
        await view.renderOnce();
        const initialNodes = countNodes(view.renderer.root);
        expect(initialNodes).toBeLessThan(300);
        await act(async () => view.mockInput.pressKey('END', { ctrl: true }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('10000');
        expect(countNodes(view.renderer.root)).toBe(initialNodes);
        await act(async () => view.mockMouse.click(10, 2));
        expect(lastSelection).toEqual({ row: 9988, column: 0 });
        await act(async () => view.mockInput.pressKey('END'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('C99');
        expect(countNodes(view.renderer.root)).toBeLessThan(300);
        await act(async () => {
            view.mockInput.pressKey('HOME');
            view.mockInput.pressKey('HOME', { ctrl: true });
        });
        await view.renderOnce();
        expect(lastSelection).toEqual({ row: 0, column: 0 });
        expect(view.captureCharFrame().split('\n')[0]).toContain('C0');
        expect(rows.at(-1)?.cells).toBe(cells);
    } finally {
        await act(async () => view.dispose());
    }
});
