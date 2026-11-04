import { act } from 'react';
import { expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import { ConnectionManager } from '../../features/connection-manager';
import { createMemoryCredentials } from '../../adapters/credentials';
import { createConnectionService } from '../../services/connections';
import { createDatabaseRegistry } from '../../adapters/databases';

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
                profiles={{ list: async () => ({ ok: true, value: [] }), save: async () => ({ ok: true, value: [] }) }}
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
