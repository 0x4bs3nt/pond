import type { DatabaseError } from '../../domain/database';

export const schemaErrorMessage = (error: DatabaseError) => {
    switch (error.code) {
        case 'permission-denied':
            return 'Permission denied. Check schema and table privileges, then press F5 to retry.';
        case 'not-found':
            return 'Relation no longer exists. Press F5 to refresh the explorer.';
        case 'closed':
        case 'unreachable':
            return 'Connection closed. Disconnect and reconnect to continue.';
        case 'timeout':
            return 'Catalog request timed out. Press F5 to retry.';
        default:
            return 'Could not load database metadata. Press F5 to retry.';
    }
};
