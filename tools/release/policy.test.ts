import { describe, expect, test } from 'bun:test';

import { nextVersion } from './policy';

describe('stable release policy', () => {
    test.each([
        [null, 'feat: introduce Pond', '', '0.1.0'],
        ['0.9.2', 'feat!: replace connection profiles', '', '0.10.0'],
        ['1.2.3', 'feat!: replace profiles', '', '2.0.0'],
        ['1.2.3', 'fix: update parsing', 'BREAKING CHANGE: old profiles require migration', '2.0.0'],
        ['0.9.2', 'feat: stable public contract', 'Release-As: 1.0.0', '1.0.0'],
    ])('calculates a stable version from %s and %s', (previous, title, body, expected) => {
        expect(nextVersion(previous, title, body)).toBe(expected);
    });

    test('does not release a maintenance-only promotion', () => {
        expect(() => nextVersion('0.1.0', 'chore: release', '')).toThrow();
    });

    test('does not permit arbitrary version overrides', () => {
        expect(() => nextVersion('0.1.0', 'feat: editing', 'Release-As: 9.0.0')).toThrow();
        expect(() => nextVersion('1.2.0', 'feat: editing', 'Release-As: 1.0.0')).toThrow();
    });
});
