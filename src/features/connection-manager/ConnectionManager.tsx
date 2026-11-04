import { useState } from 'react';
import { useStore } from 'zustand';
import { useTerminalDimensions } from '@opentui/react';
import { isConnectionProfile, type ConnectionProfile } from '../../domain/connections';
import { theme } from '../../theme';
import { useDiagnosticsReady } from '../diagnostics';
import { PasswordPrompt } from './PasswordPrompt';
import { profileMessages } from './messages';
import { useConnectionActions } from './use-connection-actions';
import { useConnectionKeyboard } from './use-connection-keyboard';
import type { ConnectionManagerProps, ProfileDraft } from './types';

const newDraft = (): ProfileDraft => ({
    id: crypto.randomUUID(),
    name: 'Local PostgreSQL',
    host: 'localhost',
    port: '5432',
    database: 'postgres',
    user: 'postgres',
    tls: 'verify-full',
});

const fields = [
    ['name', 'Name'],
    ['host', 'Host'],
    ['port', 'Port'],
    ['database', 'Database'],
    ['user', 'User'],
] as const;
const tlsModes = ['verify-full', 'require', 'disable'] as const;

export const ConnectionManager = ({ onDemo, ...dependencies }: ConnectionManagerProps) => {
    const { width, height } = useTerminalDimensions();
    const { store, save, connect, disconnect } = useConnectionActions(dependencies);

    const profiles = useStore(store, (state) => state.profiles);
    const status = useStore(store, (state) => state.status);
    const active = useStore(store, (state) => state.activeProfile);
    const message = useStore(store, (state) => state.message);

    const [draft, setDraft] = useState(newDraft);
    const [field, setField] = useState(0);
    const [prompt, setPrompt] = useState<ConnectionProfile | null>(null);

    const busy = status === 'connecting' || status === 'disconnecting';
    useDiagnosticsReady(width >= 60 && height >= 20);

    const profile = (): ConnectionProfile | null => {
        const value: ConnectionProfile = {
            id: draft.id,
            name: draft.name,
            connection: {
                engineId: 'postgres',
                database: draft.database,
                network: {
                    host: draft.host,
                    port: /^\d+$/u.test(draft.port) ? Number(draft.port) : 0,
                    user: draft.user,
                    tls: draft.tls,
                },
            },
        };

        if (isConnectionProfile(value)) return value;
        store.setState({ message: profileMessages['invalid-profile'] });

        return null;
    };

    const onSave = () => {
        const value = profile();
        if (value) void save(value);
    };

    const onConnect = () => {
        if (busy) return;
        const value = profile();
        if (value) setPrompt(value);
    };

    const onNext = (reverse = false) => {
        if (!profiles.length) return;

        setDraft((current) => {
            const index = profiles.findIndex((item) => item.id === current.id);
            const next =
                index < 0
                    ? reverse
                        ? profiles.length - 1
                        : 0
                    : (index + (reverse ? profiles.length - 1 : 1)) % profiles.length;
            const selected = profiles[next]!;

            return {
                id: selected.id,
                name: selected.name,
                database: selected.connection.database,
                ...selected.connection.network,
                port: String(selected.connection.network.port),
            };
        });
    };

    const onTLS = (reverse = false) =>
        setDraft((value) => ({ ...value, tls: tlsModes[(tlsModes.indexOf(value.tls) + (reverse ? 2 : 1)) % 3]! }));

    const openDemo = () => {
        if (status !== 'disconnected') {
            store.setState({ message: 'Disconnect before opening the mock demo.' });
            return;
        }

        onDemo();
    };

    useConnectionKeyboard({
        prompting: !!prompt,
        field,
        setField,
        onTLS,
        onSave,
        onConnect,
        onDisconnect: () => {
            void disconnect();
        },
        onNew: () => setDraft(newDraft()),
        onNext,
        onDemo: openDemo,
    });

    return (
        <box
            width={width}
            height={height}
            flexDirection="column"
            backgroundColor={theme.background}
            paddingLeft={1}
            paddingRight={1}
        >
            <text fg={theme.accent}>POND / PostgreSQL connections</text>
            <text fg={theme.muted}>
                {width < 60 || height < 20
                    ? 'Resize terminal to at least 60 × 20. Ctrl+C quits.'
                    : 'Ctrl+C quit · F2 mock demo · Passwords stay in memory'}
            </text>
            <text
                fg={theme.accent}
                onMouseDown={() => {
                    if (!prompt) onNext();
                }}
            >{`Saved profiles: ${profiles.length} · F3 next / Shift+F3 previous · Ctrl+N new`}</text>
            <box flexDirection="column" flexShrink={0} marginTop={1}>
                {fields.map(([name, label], index) => (
                    <box
                        key={name}
                        flexDirection="row"
                        height={1}
                        onMouseDown={() => {
                            if (!prompt) setField(index);
                        }}
                    >
                        <text width={12} fg={field === index ? theme.accent : theme.muted}>
                            {label}
                        </text>
                        <input
                            value={draft[name]}
                            focused={!prompt && field === index}
                            width={Math.max(10, width - 15)}
                            maxLength={255}
                            onInput={(value) => setDraft((previous) => ({ ...previous, [name]: value }))}
                            textColor={theme.text}
                            backgroundColor={theme.panel}
                        />
                    </box>
                ))}
                <text
                    height={1}
                    fg={field === 5 ? theme.accent : theme.text}
                    onMouseDown={() => {
                        if (!prompt) {
                            setField(5);
                            onTLS();
                        }
                    }}
                >
                    {`TLS         ${draft.tls} · ←/→ or click to change`}
                </text>
            </box>
            <text fg={theme.muted}>
                {draft.tls === 'verify-full'
                    ? 'Verify certificate and hostname using trusted CAs.'
                    : draft.tls === 'require'
                      ? 'Encrypted; server identity is not verified.'
                      : 'TLS disabled; connection is not encrypted.'}
            </text>
            <box flexDirection="row" height={1} marginTop={1}>
                <text
                    fg={theme.accent}
                    onMouseDown={() => {
                        if (!prompt) onSave();
                    }}
                >
                    {' '}
                    Ctrl+S Save{' '}
                </text>
                <text
                    fg={theme.accent}
                    onMouseDown={() => {
                        if (!prompt) onConnect();
                    }}
                >
                    {' '}
                    Ctrl+R Connect{' '}
                </text>
                <text
                    fg={theme.accent}
                    onMouseDown={() => {
                        if (!prompt) void disconnect();
                    }}
                >
                    {' '}
                    Ctrl+D Disconnect{' '}
                </text>
            </box>
            {prompt ? (
                <PasswordPrompt
                    onCancel={() => setPrompt(null)}
                    onSubmit={(password) => {
                        const target = prompt;
                        setPrompt(null);
                        void connect(target, password);
                    }}
                />
            ) : (
                <>
                    <text fg={theme.text}>{`Status: ${status}${active ? ` · ${active.name}` : ''}`}</text>
                    <text fg={theme.modified}>{message}</text>
                </>
            )}
        </box>
    );
};
