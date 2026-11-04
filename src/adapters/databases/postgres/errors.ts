import type { DatabaseError } from '../../../domain/database';

export const connectionError = (error: unknown): DatabaseError => {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;

    if (code === '28P01' || code === '28000') return { code: 'authentication' };
    if (code === '3D000') return { code: 'not-found' };

    if (typeof code === 'string' && (/TLS|SSL|CERT/u.test(code) || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'))
        return { code: 'tls' };

    if (
        typeof code === 'string' &&
        [
            'ECONNREFUSED',
            'ECONNRESET',
            'EPIPE',
            'ENOTFOUND',
            'EAI_AGAIN',
            'EHOSTUNREACH',
            'ENETUNREACH',
            'ETIMEDOUT',
        ].includes(code)
    )
        return { code: 'unreachable' };

    // pg has a few fixed client errors without codes. Never return or log their raw messages.
    if (error instanceof Error) {
        if (
            error.message === 'The server does not support SSL connections' ||
            error.message === 'There was an error establishing an SSL connection'
        )
            return { code: 'tls' };
        if (error.message === 'Connection terminated unexpectedly' || error.message === 'Connection terminated')
            return { code: 'unreachable' };
        if (error.message === 'SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string')
            return { code: 'authentication' };
    }

    if (typeof code === 'string' && /^[0-9A-Z]{5}$/u.test(code)) return { code: 'connection-failed' };

    throw error;
};
