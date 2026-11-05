import type { DatabaseError } from '../../domain/database';
import type { ProfileError } from '../../ports/profiles';

export const profileMessages: Record<ProfileError, string> = {
    'invalid-profile': 'Enter a name, host, database, user and a port from 1 to 65535.',
    'invalid-file': 'profiles.json is invalid. Fix the file and retry; it has not been overwritten.',
    'unsupported-version': 'Unsupported profiles.json version. Use a compatible Pond version.',
    'storage-unavailable': 'Cannot read or save profiles. Check your config directory permissions and disk space.',
};

export const connectionMessages: Record<DatabaseError['code'], string> = {
    authentication: 'Authentication failed. Check the user and password, then reconnect.',
    unreachable: 'Cannot reach PostgreSQL. Check the host, port, network and server, then retry.',
    tls: 'TLS failed. Check the server certificate, hostname and selected TLS mode.',
    'connection-failed': 'Connection failed. Check server access rules and TLS settings, then retry.',
    'not-found': 'Database not found. Check the database name and retry.',
    'invalid-request': profileMessages['invalid-profile'],
    'unsupported-engine': 'This database engine is not supported.',
    'unsupported-operation': 'This operation is not available yet.',
    cancelled: 'Connection cancelled.',
    closed: 'Connection closed. Reconnect to continue.',
    'permission-denied': 'Permission denied. Check the database role permissions.',
    'query-failed': 'Database request failed. Retry the operation.',
    timeout: 'Database request timed out. Retry the operation.',
};
