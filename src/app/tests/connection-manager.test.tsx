import { App } from '../App';
import { connectionFixture } from './connection-fixture';
import { act } from 'react';
import { expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import { ConnectionManager } from '../../features/connection-manager';
import { createMemoryCredentials } from '../../adapters/credentials';
import { createConnectionService } from '../../services/connections';
import { createDatabaseRegistry } from '../../adapters/databases';
import type { ConnectionProfile } from '../../domain/connections';

const profile: ConnectionProfile = {
    id: 'local',
    name: 'Local',
    connection: {
        engineId: 'postgres',
        database: 'pond',
        network: { host: 'localhost', port: 5432, user: 'pond', tls: 'disable' },
    },
};

test('password typing and paste stay masked, cancel clears the draft, and failed auth permits retry', async () => {
    const passwords: (string | undefined)[] = [];
    const credentials = createMemoryCredentials();
    const connections = createConnectionService(
        createDatabaseRegistry([
            {
                engineId: 'postgres',
                connect: async (_target, options) => {
                    passwords.push(options?.password);
                    return { ok: false, error: { code: 'authentication' } };
                },
            },
        ]),
        credentials
    );
    const errors: unknown[] = [];
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <ConnectionManager
                connections={connections}
                credentials={credentials}
                profiles={{
                    list: async () => ({ ok: true, value: [profile] }),
                    save: async () => ({ ok: true, value: [profile] }),
                    remove: async () => ({ ok: true, value: [] }),
                }}
                onDemo={() => {}}
                onError={(error) => errors.push(error)}
            />,
            { width: 100, height: 24 }
        );
    });
    try {
        await view.renderOnce();
        await act(async () => view.mockInput.pressKey('r', { ctrl: true }));
        await act(async () => view.mockInput.typeText('secret-q'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Password: ********');
        expect(view.captureCharFrame()).not.toContain('secret-q');
        await act(async () => view.mockInput.pressKey('\u001b[27u'));
        await act(async () => view.mockInput.pressKey('r', { ctrl: true }));
        await act(async () => view.mockInput.pasteBracketedText('pasted-secret'));
        await act(async () => view.resize(40, 10));
        await act(async () => view.resize(100, 24));
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('pasted-secret');
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(passwords).toEqual(['pasted-secret']);
        expect(view.captureCharFrame()).toContain('Authentication failed');
        await act(async () => view.mockInput.pressKey('r', { ctrl: true }));
        await act(async () => view.mockInput.pressEnter());
        expect(passwords).toEqual(['pasted-secret', '']);
        expect(errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
        await connections.dispose();
    }
});

test('validation and failed saves preserve drafts; cancel and buffered actions cannot change saved profiles', async () => {
    const { state, dependencies } = connectionFixture();
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(<ConnectionManager {...dependencies} onDemo={() => {}} />, { width: 110, height: 24 });
    });
    const key = async (name: string, ctrl = false) =>
        act(async () => (name === 'return' ? view.mockInput.pressEnter() : view.mockInput.pressKey(name, { ctrl })));
    try {
        await key('e', true);
        await act(async () => view.mockInput.pressTab());
        await act(async () => view.mockInput.pressTab());
        await key('a', true);
        await key('k', true);
        await act(async () => view.mockInput.typeText('0'));
        await key('s', true);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Enter a whole number from 1 to 65535.');
        expect(state.profiles[0]!.connection.network.port).toBe(5432);
        await key('a', true);
        await key('k', true);
        await act(async () => view.mockInput.typeText('5433'));
        state.saveFails = true;
        await key('s', true);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('5433');
        expect(view.captureCharFrame()).toContain('Cannot read or update profiles');
        await key('\u001b[27u');
        expect(state.profiles[0]!.connection.network.port).toBe(5432);
        await key('e', true);
        await act(async () => view.mockInput.typeText(' edited'));
        const pending = Promise.withResolvers<void>();
        state.pendingSave = pending.promise;
        state.saveFails = false;
        await key('s', true);
        await act(async () => {
            view.mockInput.pressKey('\u001b[27u');
            view.mockInput.pressKey('n', { ctrl: true });
            view.mockInput.pressKey('r', { ctrl: true });
        });
        await act(async () => pending.resolve());
        expect(state.profiles).toHaveLength(1);
        expect(state.profiles[0]!.id).toBe('local');
        expect(state.profiles[0]!.name).toContain('edited');
        expect(state.targets).toEqual([]);
        await key('n', true);
        await key('s', true);
        expect(state.profiles).toHaveLength(2);
        expect(state.profiles[1]!.id).not.toBe('local');
        expect(state.errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
        await dependencies.connections.dispose();
    }
});

test('batched cancel and new starts a fresh form and rejects the previous form’s save', async () => {
    const { state, dependencies } = connectionFixture();
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(<ConnectionManager {...dependencies} onDemo={() => {}} />, { width: 110, height: 24 });
    });
    try {
        await act(async () => view.mockInput.pressKey('e', { ctrl: true }));
        await act(async () => view.mockInput.typeText(' cancelled edit'));
        await act(async () => {
            view.mockInput.pressKey('\u001b[27u');
            view.mockInput.pressKey('n', { ctrl: true });
        });
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('New connection');
        expect(view.captureCharFrame()).toContain('Local PostgreSQL');
        expect(view.captureCharFrame()).not.toContain('cancelled edit');

        await act(async () => view.mockInput.typeText(' cancelled new'));
        await act(async () => {
            view.mockInput.pressKey('\u001b[27u');
            view.mockInput.pressKey('n', { ctrl: true });
            view.mockInput.pressKey('s', { ctrl: true });
        });
        expect(state.profiles).toEqual([profile]);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('New connection');
        expect(view.captureCharFrame()).not.toContain('cancelled new');
        await act(async () => view.mockInput.pressKey('s', { ctrl: true }));
        expect(state.profiles).toHaveLength(2);
        expect(state.profiles[0]).toEqual(profile);
        expect(state.profiles[1]!.id).not.toBe(profile.id);
        expect(state.profiles[1]!.name).toBe('Local PostgreSQL');
        expect(state.errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
        await dependencies.connections.dispose();
    }
});

test('a session closed during subscription leaves the manager usable for reconnecting', async () => {
    const { state, dependencies } = connectionFixture();
    state.closeOnSubscribe = true;
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(<ConnectionManager {...dependencies} onDemo={() => {}} />, { width: 110, height: 24 });
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(state.targets).toEqual(['pond']);
        expect(view.captureCharFrame()).toContain('POND / Connections');
        expect(view.captureCharFrame()).toContain('Connection closed. Reconnect to continue.');
        expect(state.catalogs).toBe(0);

        state.closeOnSubscribe = false;
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Connected to pond');
        expect(state.targets).toEqual(['pond', 'pond']);
        expect(state.closeAttempts).toBe(1);
        expect(state.errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
        await dependencies.connections.dispose();
    }
});

test('active edits require reconnect; deletion retains the profile on cleanup or storage failure', async () => {
    const { state, dependencies } = connectionFixture();
    state.profiles.push({ ...profile, id: 'other', name: 'Other' });
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(<ConnectionManager {...dependencies} onDemo={() => {}} />, { width: 110, height: 24 });
    });
    const key = async (name: string, ctrl = false) =>
        act(async () => (name === 'return' ? view.mockInput.pressEnter() : view.mockInput.pressKey(name, { ctrl })));
    try {
        await key('return');
        await key('return');
        expect(state.targets).toEqual(['pond']);
        await key('F2');
        await key('e', true);
        for (let i = 0; i < 3; i++) await act(async () => view.mockInput.pressTab());
        await key('a', true);
        await key('k', true);
        await act(async () => view.mockInput.typeText('updated'));
        await key('s', true);
        expect(state.profiles[0]!.connection.database).toBe('updated');
        expect(state.closeAttempts).toBe(0);
        await key('F3');
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Connected to pond');
        expect(state.catalogs).toBe(1);
        await key('F2');
        await key('return');
        await key('return');
        expect(state.targets).toEqual(['pond', 'updated']);
        expect(state.closeAttempts).toBe(1);
        await key('F2');
        await act(async () => {
            view.mockInput.pressKey('DELETE');
            view.mockInput.pressEnter();
        });
        expect(state.removeAttempts).toBe(0);
        await key('\u001b[27u');
        expect(state.profiles).toHaveLength(2);
        await key('DELETE');
        state.closeFails = true;
        await key('y', true);
        expect(state.removeAttempts).toBe(0);
        expect(state.profiles).toHaveLength(2);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Profile kept');
        state.closeFails = false;
        state.removeFails = true;
        await key('y', true);
        expect(state.removeAttempts).toBe(1);
        expect(state.profiles).toHaveLength(2);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Status: disconnected');
        const closes = state.closeAttempts;
        state.removeFails = false;
        await key('y', true);
        expect(state.closeAttempts).toBe(closes);
        expect(state.profiles.map((item) => item.id)).toEqual(['other']);
        await key('e', true);
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Other');
        expect(state.errors).toEqual([]);
    } finally {
        state.closeFails = false;
        await act(async () => view.dispose());
        await dependencies.connections.dispose();
    }
});

test('manager navigation preserves the session and pending demo edits while hidden views ignore input', async () => {
    const { state, dependencies } = connectionFixture();
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <App
                connectionDependencies={dependencies}
                tables={[
                    {
                        id: 'people',
                        name: 'people',
                        namespace: 'public',
                        columns: [{ id: 'name', name: 'Name', type: 'varchar', width: 24 }],
                        rows: [{ id: '1', cells: ['Alice'] }],
                    },
                ]}
            />,
            { width: 110, height: 24 }
        );
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressKey('F2'));
        await act(async () => view.mockInput.pressKey('F2'));
        await act(async () => view.mockInput.pressEnter());
        await act(async () => {
            view.mockInput.pressKey('a', { ctrl: true });
            view.mockInput.pressKey('k', { ctrl: true });
            view.mockInput.typeText('Edited');
        });
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('1 pending cells');
        await act(async () => view.mockInput.pressKey('F2'));
        await act(async () => view.mockInput.pressKey('F5'));
        expect(state.catalogs).toBe(1);
        expect(state.closeAttempts).toBe(0);
        await act(async () => view.mockInput.pressKey('e', { ctrl: true }));
        await act(async () => {
            view.mockInput.typeText('q');
            view.mockInput.pressKey('d', { ctrl: true });
            view.mockInput.pressKey('w', { ctrl: true });
            view.mockInput.pressKey('F2');
        });
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Edit connection');
        expect(state.closeAttempts).toBe(0);
        await act(async () => view.mockInput.pressKey('\u001b[27u'));
        await act(async () => view.mockInput.pressKey('F2'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Edited');
        expect(view.captureCharFrame()).toContain('1 pending cells');
        await act(async () => view.mockInput.pressKey('F2'));
        await act(async () => view.mockInput.pressKey('F3'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Connected to pond');
        expect(state.catalogs).toBe(1);
        expect(state.errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
        await dependencies.connections.dispose();
    }
});
