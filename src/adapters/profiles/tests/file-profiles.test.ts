import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFileProfiles } from '../file-profiles';
import type { ConnectionProfile } from '../../../domain/connections';

const profile: ConnectionProfile = {
    id: 'local',
    name: 'Local',
    connection: {
        engineId: 'postgres',
        database: 'postgres',
        network: { host: 'localhost', port: 5432, user: 'pond', tls: 'verify-full' },
    },
};

test('profiles round-trip without secrets, preserve other profiles, and use private atomic files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-profiles-'));
    try {
        const repository = createFileProfiles(directory);
        expect(await repository.list()).toEqual({ ok: true, value: [] });
        const secret = 'do-not-persist-this-password';
        const extra = { ...profile, password: secret, connection: { ...profile.connection, password: secret } };
        await Promise.all([repository.save(extra), repository.save({ ...profile, id: 'second', name: 'Second' })]);
        await repository.save({ ...profile, name: 'Renamed' });
        const loaded = await createFileProfiles(directory).list();
        expect(loaded.ok && loaded.value).toEqual([
            { ...profile, id: 'second', name: 'Second' },
            { ...profile, name: 'Renamed' },
        ]);
        const raw = await readFile(join(directory, 'profiles.json'), 'utf8');
        expect(raw).not.toContain(secret);
        expect(raw).not.toContain('password');
        expect(await readdir(directory)).toEqual(['profiles.json']);
        if (process.platform !== 'win32')
            expect((await stat(join(directory, 'profiles.json'))).mode & 0o777).toBe(0o600);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('malformed, newer and unknown profile data cannot be silently overwritten', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-profiles-'));
    try {
        const repository = createFileProfiles(directory);
        for (const original of [
            '{broken',
            JSON.stringify({ version: 2, profiles: [] }),
            JSON.stringify({ version: 1, profiles: [{ ...profile, futureSetting: true }] }),
            JSON.stringify({ version: 1, profiles: [profile, profile] }),
        ]) {
            await writeFile(join(directory, 'profiles.json'), original);
            expect((await repository.list()).ok).toBe(false);
            expect((await repository.save(profile)).ok).toBe(false);
            expect(await readFile(join(directory, 'profiles.json'), 'utf8')).toBe(original);
        }
        const blocked = join(directory, 'not-a-directory');
        await writeFile(blocked, 'unchanged');
        expect(await createFileProfiles(blocked).save(profile)).toEqual({ ok: false, error: 'storage-unavailable' });
        expect(await readFile(blocked, 'utf8')).toBe('unchanged');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
