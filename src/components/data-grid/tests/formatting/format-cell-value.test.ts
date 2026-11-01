import { expect, test } from 'bun:test';
import { formatCellValue } from '../../formatting/format-cell-value';

test('bounds large previews without changing source data or splitting Unicode clusters', () => {
    const prefix = '田中 🌱 e\u0301 👩‍👩‍👧‍👦\n';
    const source = prefix.repeat(10_000);
    const result = formatCellValue(source, 24);
    expect(result.length).toBeLessThanOrEqual(385);
    expect(result.endsWith('…')).toBe(true);
    expect(result.includes('\ufffd')).toBe(false);
    const whole = new Set(
        [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(source.slice(0, 500))].map(
            (part) => part.index
        )
    );
    expect(whole.has(result.length - 1)).toBe(true);
    expect(source).toBe(prefix.repeat(10_000));
});

test('keeps NULL, empty text, exact numbers, and ordinary Unicode distinct', () => {
    expect(formatCellValue(null, 24)).toBe('NULL');
    expect(formatCellValue('', 24)).toBe("''");
    expect(formatCellValue('9007199254740993.25', 24)).toBe('9007199254740993.25');
    expect(formatCellValue('田中 🌱 e\u0301\tline\nnext', 24)).toBe('田中 🌱 e\u0301 line next');
    expect(formatCellValue('e' + '\u0301'.repeat(100_000), 24)).toBe('…');
});
