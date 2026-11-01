import type { SafeError } from './types';
const errorNames = new Set([
    'Error',
    'TypeError',
    'RangeError',
    'SyntaxError',
    'ReferenceError',
    'URIError',
    'AggregateError',
    'EvalError',
]);
const errorCodes = new Set([
    'EACCES',
    'EPERM',
    'ENOENT',
    'ENOSPC',
    'EIO',
    'EROFS',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
]);

// Messages, arbitrary properties, function names, and thrown strings may contain database values.
// Keep only known classifications and source locations, including a bounded cause chain.
export const safeError = (value: unknown, depth = 0): SafeError => {
    try {
        if (!(value instanceof Error)) return { name: 'NonErrorThrow' };

        const result: SafeError = { name: errorNames.has(value.name) ? value.name : 'Error' };
        const code = 'code' in value ? value.code : undefined;

        if (typeof code === 'string' && errorCodes.has(code)) result.code = code;
        if (typeof value.stack === 'string') {
            result.frames = value.stack
                .slice(0, 16384)
                .split('\n')
                .slice(1, 25)
                .flatMap((line) => {
                    const match = line.match(/(?:\/|\\)([a-zA-Z0-9_.-]+\.[cm]?[jt]sx?):(\d+):(\d+)\)?\s*$/);
                    return match ? [`${match[1]}:${match[2]}:${match[3]}`] : [];
                })
                .slice(0, 12);
        }

        if (depth < 2 && value.cause !== undefined) result.cause = safeError(value.cause, depth + 1);

        return result;
    } catch {
        return { name: 'UnreadableError' };
    }
};
