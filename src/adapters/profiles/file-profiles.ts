import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { copyProfile, isConnectionProfile, type ConnectionProfile } from '../../domain/connections';
import type { ProfileRepository, ProfileResult } from '../../ports/profiles';
import { profileDirectory } from './profile-directory';

const hasCode = (error: unknown, code: string) =>
    error !== null && typeof error === 'object' && 'code' in error && error.code === code;

export const createFileProfiles = (directory = profileDirectory()): ProfileRepository => {
    const path = join(directory, 'profiles.json');
    let writes = Promise.resolve();

    const list = async (): Promise<ProfileResult<readonly ConnectionProfile[]>> => {
        let text: string;

        try {
            text = await readFile(path, 'utf8');
        } catch (error) {
            return hasCode(error, 'ENOENT') ? { ok: true, value: [] } : { ok: false, error: 'storage-unavailable' };
        }

        try {
            const data = JSON.parse(text);

            if (!data || typeof data !== 'object') return { ok: false, error: 'invalid-file' };
            if (data.version !== 1) return { ok: false, error: 'unsupported-version' };
            if (
                Object.keys(data).some((key) => !['version', 'profiles'].includes(key)) ||
                !Array.isArray(data.profiles) ||
                !data.profiles.every(isConnectionProfile) ||
                new Set(data.profiles.map((profile: ConnectionProfile) => profile.id)).size !== data.profiles.length
            )
                return { ok: false, error: 'invalid-file' };

            for (const profile of data.profiles as ConnectionProfile[]) {
                if (
                    Object.keys(profile).some((key) => !['id', 'name', 'connection'].includes(key)) ||
                    Object.keys(profile.connection).some((key) => !['engineId', 'database', 'network'].includes(key)) ||
                    Object.keys(profile.connection.network).some(
                        (key) => !['host', 'port', 'user', 'tls'].includes(key)
                    )
                )
                    return { ok: false, error: 'invalid-file' };
            }

            return { ok: true, value: data.profiles.map(copyProfile) };
        } catch {
            return { ok: false, error: 'invalid-file' };
        }
    };

    const update = (change: (profiles: readonly ConnectionProfile[]) => readonly ConnectionProfile[]) => {
        const write = writes.then(async (): Promise<ProfileResult<readonly ConnectionProfile[]>> => {
            const existing = await list();
            if (!existing.ok) return existing;

            const profiles = change(existing.value);
            const temporary = join(directory, `.profiles-${crypto.randomUUID()}.tmp`);

            try {
                await mkdir(directory, { recursive: true, mode: 0o700 });
                await writeFile(temporary, JSON.stringify({ version: 1, profiles }, null, 4) + '\n', {
                    mode: 0o600,
                    flag: 'wx',
                });

                await rename(temporary, path);

                return { ok: true, value: profiles };
            } catch {
                return { ok: false, error: 'storage-unavailable' };
            } finally {
                await rm(temporary, { force: true }).catch(() => {});
            }
        });

        writes = write.then(() => {});

        return write;
    };

    const save = async (profile: ConnectionProfile): Promise<ProfileResult<readonly ConnectionProfile[]>> => {
        if (!isConnectionProfile(profile)) return { ok: false, error: 'invalid-profile' };
        const clean = copyProfile(profile);

        return update((profiles) =>
            profiles.some((item) => item.id === clean.id)
                ? profiles.map((item) => (item.id === clean.id ? clean : item))
                : [...profiles, clean]
        );
    };

    const remove = (id: string) => update((profiles) => profiles.filter((profile) => profile.id !== id));

    return { list, save, remove };
};
