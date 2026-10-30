import { expect, test } from 'bun:test';
import { moveSelection } from './move-selection';

test('page navigation clamps at the first and last rows', () => {
    expect(moveSelection({ row: 3, column: 1 }, 'pageup', false, 100, 2, 10)).toEqual({ row: 0, column: 1 });
    expect(moveSelection({ row: 97, column: 1 }, 'pagedown', false, 100, 2, 10)).toEqual({ row: 99, column: 1 });
});
