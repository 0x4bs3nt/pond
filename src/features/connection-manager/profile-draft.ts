import { isConnectionProfile, type ConnectionProfile } from '../../domain/connections';
import type { ProfileDraft, ProfileErrors } from './types';

export const profileFields = [
    ['name', 'Name'],
    ['host', 'Host'],
    ['port', 'Port'],
    ['database', 'Database'],
    ['user', 'User'],
] as const;
export const tlsModes = ['verify-full', 'require', 'disable'] as const;

export const createDraft = (profile?: ConnectionProfile): ProfileDraft =>
    profile
        ? {
              id: profile.id,
              name: profile.name,
              database: profile.connection.database,
              ...profile.connection.network,
              port: String(profile.connection.network.port),
          }
        : {
              id: crypto.randomUUID(),
              name: 'Local PostgreSQL',
              host: 'localhost',
              port: '5432',
              database: 'postgres',
              user: 'postgres',
              tls: 'verify-full',
          };

export const validateDraft = (draft: ProfileDraft) => {
    const errors: ProfileErrors = {};
    for (const [field] of profileFields) {
        const value = draft[field];

        if (!value.trim() || value.length > 255 || /[\x00-\x1f\x7f]/u.test(value))
            errors[field] = 'Required; at most 255 characters, without control characters.';
    }

    if (/[\s/@?#]/u.test(draft.host)) errors.host = 'Use a hostname or IP address, without spaces or a URL.';
    if (!/^\d+$/u.test(draft.port) || Number(draft.port) < 1 || Number(draft.port) > 65535)
        errors.port = 'Enter a whole number from 1 to 65535.';

    const profile: ConnectionProfile = {
        id: draft.id,
        name: draft.name,
        connection: {
            engineId: 'postgres',
            database: draft.database,
            network: { host: draft.host, port: Number(draft.port), user: draft.user, tls: draft.tls },
        },
    };

    return { errors, profile: Object.keys(errors).length === 0 && isConnectionProfile(profile) ? profile : null };
};
