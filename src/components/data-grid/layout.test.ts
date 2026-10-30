import { expect, test } from 'bun:test';
import { layoutColumns, revealCell } from './layout';

const columns = layoutColumns([
    { id: 'a', name: 'a', type: 'text', width: 10 },
    { id: 'b', name: 'b', type: 'text', width: 50 },
]);

test('reveals a cell wider than the viewport from its left edge', () => {
    expect(revealCell({ top: 0, left: 0 }, { row: 99, column: 1 }, columns, 100, 20, 10)).toEqual({
        top: 90,
        left: 10,
    });
});

test('clamps scrolling when the viewport expands or data becomes empty', () => {
    expect(revealCell({ top: 90, left: 40 }, { row: 99, column: 1 }, columns, 100, 100, 100)).toEqual({
        top: 0,
        left: 0,
    });
    expect(revealCell({ top: 90, left: 40 }, { row: 0, column: 0 }, [], 0, 20, 10)).toEqual({ top: 0, left: 0 });
});
