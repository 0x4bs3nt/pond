import { expect, test } from 'bun:test';
import { connectionError } from '../errors';

test('driver codes produce safe actionable errors without exposing server details', () => {
    for (const [code, expected] of [
        ['28P01', 'authentication'],
        ['3D000', 'not-found'],
        ['ECONNREFUSED', 'unreachable'],
        ['ETIMEDOUT', 'unreachable'],
        ['DEPTH_ZERO_SELF_SIGNED_CERT', 'tls'],
        ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls'],
        ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'tls'],
        ['53300', 'connection-failed'],
    ] as const) {
        expect(connectionError({ code, message: 'password=secret SQL sensitive', detail: 'private' })).toEqual({
            code: expected,
        });
    }
    const unexpected = new TypeError('programming error');
    expect(() => connectionError(unexpected)).toThrow(unexpected);
});
