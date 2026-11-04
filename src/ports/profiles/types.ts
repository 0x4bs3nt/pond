import type { ConnectionProfile } from '../../domain/connections';

export type ProfileError = 'invalid-profile' | 'invalid-file' | 'unsupported-version' | 'storage-unavailable';
export type ProfileResult<T> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ProfileError };
export type ProfileRepository = {
    list: () => Promise<ProfileResult<readonly ConnectionProfile[]>>;
    save: (profile: ConnectionProfile) => Promise<ProfileResult<readonly ConnectionProfile[]>>;
};
