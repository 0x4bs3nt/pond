import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useTerminalDimensions } from '@opentui/react';
import { SelectableList } from '../../components/navigation';
import { theme } from '../../theme';
import { useDiagnosticsReady } from '../diagnostics';
import { DatabaseExplorer } from '../schema-explorer';
import { PasswordPrompt } from './PasswordPrompt';
import { ProfileForm } from './ProfileForm';
import { useConnectionActions } from './use-connection-actions';
import { useConnectionKeyboard } from './use-connection-keyboard';
import type { ConnectionManagerProps, ManagerView } from './types';

export const ConnectionManager = ({ onDemo, isActive = () => true, ...dependencies }: ConnectionManagerProps) => {
    const { width, height } = useTerminalDimensions();
    const { store, session, load, save, connect, disconnect, remove } = useConnectionActions(dependencies);
    const profiles = useStore(store, (state) => state.profiles);
    const profilesStatus = useStore(store, (state) => state.profilesStatus);
    const selectedId = useStore(store, (state) => state.selectedId);
    const status = useStore(store, (state) => state.status);
    const operation = useStore(store, (state) => state.operation);
    const active = useStore(store, (state) => state.activeProfile);
    const message = useStore(store, (state) => state.message);
    const [view, setView] = useState<ManagerView>({ kind: 'list' });
    const viewRef = useRef(view);
    const sizeReady = width >= 60 && height >= 20;
    const sizeRef = useRef(sizeReady);
    sizeRef.current = sizeReady;
    const navigate = (next: ManagerView) => {
        viewRef.current = next;
        setView(next);
    };
    const showList = () => navigate({ kind: 'list' });
    const idle = () => {
        const state = store.getState();
        return (
            isActive() &&
            state.operation === 'idle' &&
            state.status !== 'connecting' &&
            state.status !== 'disconnecting'
        );
    };
    const canManage = () => idle() && sizeRef.current && store.getState().profilesStatus === 'ready';
    const listReady = () => canManage() && viewRef.current.kind === 'list';
    const selected = () => store.getState().profiles.find((item) => item.id === store.getState().selectedId);
    const select = (id: string) => {
        if (listReady()) store.setState({ selectedId: id });
    };
    const edit = () => {
        if (listReady() && selected()) navigate({ kind: 'form', visitId: crypto.randomUUID(), profile: selected()! });
    };
    const create = () => {
        if (listReady()) navigate({ kind: 'form', visitId: crypto.randomUUID() });
    };
    const startConnection = () => {
        if (!listReady() || store.getState().status === 'disconnect-failed') return;
        const profile = selected();
        if (profile) navigate({ kind: 'password', profile });
    };
    const confirmDelete = async () => {
        const current = viewRef.current;
        if (!canManage() || current.kind !== 'delete') return;
        if (await remove(current.profile.id)) showList();
    };
    const startDelete = () => {
        if (listReady() && selected()) navigate({ kind: 'delete', profile: selected()! });
    };
    const cancel = () => {
        if (!isActive() || store.getState().operation !== 'idle') return;
        if (store.getState().status === 'connecting') void disconnect();
        else if (viewRef.current.kind === 'delete') showList();
    };
    const closeConnection = () => {
        if (!isActive() || !['list', 'workspace'].includes(viewRef.current.kind)) return;
        showList();
        void disconnect();
    };
    const openWorkspace = () => {
        if (idle() && viewRef.current.kind === 'list' && session && store.getState().status === 'connected')
            navigate({ kind: 'workspace' });
    };
    const openDemo = () => {
        if (idle() && viewRef.current.kind === 'list') onDemo();
    };
    const reload = () => {
        if (idle() && viewRef.current.kind === 'list' && store.getState().profilesStatus !== 'loading') void load();
    };
    const workspaceActive = () => isActive() && viewRef.current.kind === 'workspace';

    useEffect(() => {
        if (!session && viewRef.current.kind === 'workspace') showList();
    }, [session]);
    useDiagnosticsReady(sizeReady);
    useConnectionKeyboard({
        getMode: () => (isActive() ? viewRef.current.kind : null),
        onMove: (offset) => {
            if (!listReady()) return;
            const state = store.getState();
            const index = state.profiles.findIndex((item) => item.id === state.selectedId);
            const next = state.profiles[Math.max(0, Math.min(state.profiles.length - 1, index + offset))];
            if (next) select(next.id);
        },
        onConnect: startConnection,
        onDisconnect: closeConnection,
        onNew: create,
        onEdit: edit,
        onDelete: startDelete,
        onConfirmDelete: () => {
            void confirmDelete();
        },
        onCancel: cancel,
        onReload: reload,
        onWorkspace: openWorkspace,
        onDemo: openDemo,
    });
    const busy = operation !== 'idle' || status === 'connecting' || status === 'disconnecting';
    const listEnabled = !busy && profilesStatus === 'ready' && sizeReady;
    return (
        <>
            {session && active && (
                <box visible={view.kind === 'workspace'}>
                    <DatabaseExplorer
                        session={session}
                        databaseName={active.connection.database}
                        isActive={workspaceActive}
                        onConnections={showList}
                        onDisconnect={closeConnection}
                        onError={dependencies.onError}
                    />
                </box>
            )}
            <box
                visible={view.kind !== 'workspace'}
                width={width}
                height={height}
                flexDirection="column"
                backgroundColor={theme.background}
                paddingLeft={1}
                paddingRight={1}
            >
                <text height={1} fg={theme.accent}>
                    POND / Connections
                </text>
                <text height={1} fg={theme.muted}>
                    {sizeReady
                        ? 'Saved settings only · Passwords are never saved · Ctrl+C quit'
                        : 'Resize terminal to at least 60 × 20. Ctrl+C quits.'}
                </text>
                <box flexGrow={1} flexDirection="column">
                    {view.kind === 'form' ? (
                        <ProfileForm
                            key={view.visitId}
                            profile={view.profile}
                            enabled={isActive() && !busy && sizeReady}
                            isActive={() => canManage() && viewRef.current === view}
                            onCancel={() => {
                                if (viewRef.current === view) showList();
                            }}
                            onSave={(profile) => {
                                if (viewRef.current !== view) return;
                                void save(profile).then((saved) => {
                                    if (saved && viewRef.current === view) showList();
                                });
                            }}
                        />
                    ) : view.kind === 'password' ? (
                        <>
                            <text fg={theme.accent}>{`Connect to ${view.profile.name}`}</text>
                            <PasswordPrompt
                                onCancel={showList}
                                onSubmit={(password) => {
                                    const current = viewRef.current;
                                    if (current.kind !== 'password') return;
                                    showList();
                                    void connect(current.profile, password).then((connected) => {
                                        if (connected && store.getState().status === 'connected')
                                            navigate({ kind: 'workspace' });
                                    });
                                }}
                            />
                        </>
                    ) : view.kind === 'delete' ? (
                        <box flexDirection="column">
                            <text fg={theme.modified}>{`Delete saved connection “${view.profile.name}”?`}</text>
                            <text fg={theme.text}>
                                Only the saved configuration is deleted. The database and its data are never deleted.
                            </text>
                            <text fg={theme.muted}>
                                {active?.id === view.profile.id
                                    ? 'The active connection must close successfully first.'
                                    : 'This cannot be undone.'}
                            </text>
                            <box flexDirection="row" height={1}>
                                <text
                                    fg={busy ? theme.muted : theme.modified}
                                    onMouseDown={() => {
                                        void confirmDelete();
                                    }}
                                >
                                    {' '}
                                    Ctrl+Y Delete{' '}
                                </text>
                                <text fg={busy ? theme.muted : theme.accent} onMouseDown={cancel}>
                                    {' '}
                                    Esc Cancel{' '}
                                </text>
                            </box>
                        </box>
                    ) : (
                        <>
                            <SelectableList
                                height={Math.max(2, height - 10)}
                                selectedId={selectedId}
                                disabled={!listEnabled}
                                items={profiles.map((profile) => ({
                                    id: profile.id,
                                    label: `${profile.name}${active?.id === profile.id ? ` · ${status}` : ''}`,
                                    detail: `${profile.connection.network.user}@${profile.connection.network.host}:${profile.connection.network.port}/${profile.connection.database} · TLS ${profile.connection.network.tls}`,
                                }))}
                                message={
                                    profilesStatus === 'loading'
                                        ? 'Loading saved connections…'
                                        : profilesStatus === 'error'
                                          ? 'Could not load connections. F5 Retry.'
                                          : !profiles.length
                                            ? 'No saved connections. Ctrl+N creates your first connection.'
                                            : undefined
                                }
                                onSelect={select}
                            />
                            <box height={1} flexDirection="row">
                                <text fg={listEnabled ? theme.accent : theme.muted} onMouseDown={create}>
                                    {' '}
                                    Ctrl+N New{' '}
                                </text>
                                <text fg={listEnabled && selectedId ? theme.accent : theme.muted} onMouseDown={edit}>
                                    {' '}
                                    Ctrl+E Edit{' '}
                                </text>
                                <text
                                    fg={listEnabled && selectedId ? theme.accent : theme.muted}
                                    onMouseDown={startDelete}
                                >
                                    {' '}
                                    Delete{' '}
                                </text>
                                <text
                                    fg={
                                        listEnabled && selectedId && status !== 'disconnect-failed'
                                            ? theme.accent
                                            : theme.muted
                                    }
                                    onMouseDown={startConnection}
                                >
                                    {' '}
                                    Enter Connect / reconnect{' '}
                                </text>
                            </box>
                            <box height={1} flexDirection="row">
                                <text fg={session && !busy ? theme.accent : theme.muted} onMouseDown={openWorkspace}>
                                    {' '}
                                    F3 Workspace{' '}
                                </text>
                                <text fg={busy ? theme.muted : theme.accent} onMouseDown={closeConnection}>
                                    {' '}
                                    Ctrl+D Disconnect{' '}
                                </text>
                                <text fg={theme.accent} onMouseDown={cancel}>
                                    {status === 'connecting' ? ' Esc Cancel ' : ''}
                                </text>
                            </box>
                            <box height={1} flexDirection="row">
                                <text fg={busy ? theme.muted : theme.accent} onMouseDown={openDemo}>
                                    {' '}
                                    F2 Mock demo (development){' '}
                                </text>
                                <text
                                    fg={busy || profilesStatus === 'loading' ? theme.muted : theme.accent}
                                    onMouseDown={reload}
                                >
                                    {' '}
                                    F5 Reload{' '}
                                </text>
                            </box>
                        </>
                    )}
                </box>
                <text height={1} fg={theme.text}>{`Status: ${status}${active ? ` · ${active.name}` : ''}`}</text>
                <text height={2} fg={theme.modified}>
                    {message}
                </text>
            </box>
        </>
    );
};
