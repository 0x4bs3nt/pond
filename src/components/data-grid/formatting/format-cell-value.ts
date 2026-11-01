const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export const formatCellValue = (value: string | null | undefined, width: number): string => {
    if (value === null) return 'NULL';
    if (value === '') return "''";

    const text = value ?? '';
    const limit = Math.max(32, Math.min(8192, Math.ceil(width) * 16));

    if (text.length <= limit) return text.replace(/[\r\n\t]/g, ' ');

    const prefix = text.slice(0, limit);
    let end = 0;

    // Drop the last segment: the bounded slice may have cut a grapheme in half.
    for (const segment of graphemes.segment(prefix)) end = segment.index;

    return prefix.slice(0, end).replace(/[\r\n\t]/g, ' ') + '…';
};
