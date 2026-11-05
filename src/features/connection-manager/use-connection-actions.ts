import { useEffect, useRef, useState } from 'react';
import { copyProfile, type ConnectionProfile } from '../../domain/connections';
import { removeProfile } from '../../services/connections';
import { createConnectionStore } from '../../state/connections';
import { connectionMessages, profileMessages } from './messages';
import type { ConnectionDependencies } from './types';
import type { DatabaseSession } from '../../ports/database';

export const useConnectionActions = ({ profiles, credentials, connections, onError }: ConnectionDependencies) => {
    const [store] = useState(createConnectionStore);
    const [session, setSession] = useState<DatabaseSession | null>(null);
    const alive = useRef(true);
    const request = useRef(0);
    const unsubscribe = useRef<(() => void) | undefined>(undefined);

    const load = async () => {
        if (store.getState().operation !== 'idle') return;
        store.setState({ profilesStatus: 'loading', message: '' });
        try {
            const result = await profiles.list();
            if (!alive.current) return;
            const selectedId = store.getState().selectedId;
            store.setState(
                result.ok
                    ? {
                          profiles: result.value,
                          profilesStatus: 'ready',
                          selectedId: result.value.some((item) => item.id === selectedId)
                              ? selectedId
                              : (result.value[0]?.id ?? null),
                      }
                    : { profilesStatus: 'error', message: profileMessages[result.error] }
            );
        } catch (error) {
            onError(error);
        }
    };

    useEffect(() => {
        alive.current = true;
        void load();
        return () => {
            alive.current = false;
            request.current++;
            unsubscribe.current?.();
            credentials.clear();
            void connections.disconnect().catch(onError);
        };
    }, [profiles, credentials, connections, onError, store]);

    const save = async (profile: ConnectionProfile) => {
        if (store.getState().operation !== 'idle' || store.getState().profilesStatus !== 'ready') return false;
        store.setState({ operation: 'saving', message: 'Saving profile…' });
        try {
            const result = await profiles.save(copyProfile(profile));
            if (!alive.current) return false;
            store.setState(
                result.ok
                    ? {
                          profiles: result.value,
                          selectedId: profile.id,
                          message:
                              store.getState().activeProfile?.id === profile.id
                                  ? 'Profile saved. Reconnect to apply the new settings.'
                                  : 'Profile saved. Passwords are never saved.',
                      }
                    : { message: profileMessages[result.error] }
            );
            return result.ok;
        } catch (error) {
            onError(error);
            return false;
        } finally {
            if (alive.current) store.setState({ operation: 'idle' });
        }
    };

    const detach = () => {
        unsubscribe.current?.();
        unsubscribe.current = undefined;
        setSession(null);
        return ++request.current;
    };

    const connect = async (profile: ConnectionProfile, password: string) => {
        const state = store.getState();
        if (state.operation !== 'idle' || ['connecting', 'disconnecting', 'disconnect-failed'].includes(state.status))
            return false;
        const current = detach();
        const snapshot = copyProfile(profile);
        credentials.setPassword(snapshot.id, password);
        store.setState({ status: 'connecting', activeProfile: null, message: 'Connecting… Esc cancels.' });
        try {
            const result = await connections.connect(snapshot);
            if (!alive.current || current !== request.current) return false;
            if (!result.ok) {
                store.setState({ status: 'disconnected', message: connectionMessages[result.error.code] });
                return false;
            }
            store.setState({ status: 'connected', activeProfile: snapshot, message: 'Connected.' });
            setSession(result.value);
            unsubscribe.current = result.value.subscribeClose(() => {
                if (alive.current && current === request.current) {
                    setSession(null);
                    store.setState({ status: 'disconnected', activeProfile: null, message: connectionMessages.closed });
                }
            });
            return true;
        } catch (error) {
            onError(error);
            return false;
        }
    };

    const disconnect = async () => {
        if (store.getState().status === 'disconnecting' || store.getState().operation !== 'idle') return;
        const current = detach();
        store.setState({ status: 'disconnecting', message: 'Disconnecting…' });
        try {
            await connections.disconnect();
            if (alive.current && current === request.current)
                store.setState({ status: 'disconnected', activeProfile: null, message: 'Disconnected.' });
        } catch {
            if (alive.current && current === request.current)
                store.setState({
                    status: 'disconnect-failed',
                    message: 'Could not close the connection. Retry Disconnect before connecting again.',
                });
        }
    };

    const remove = async (id: string) => {
        const state = store.getState();
        if (
            state.operation !== 'idle' ||
            state.profilesStatus !== 'ready' ||
            ['connecting', 'disconnecting'].includes(state.status)
        )
            return false;
        const isActive = state.activeProfile?.id === id;
        if (isActive) detach();
        store.setState({
            operation: 'deleting',
            ...(isActive ? { status: 'disconnecting' as const } : {}),
            message: 'Deleting profile…',
        });
        try {
            const result = await removeProfile({
                profiles,
                connections,
                id,
                activeId: state.activeProfile?.id ?? null,
            });
            if (!alive.current) return false;
            if (result.disconnected) store.setState({ status: 'disconnected', activeProfile: null });
            if (!result.ok) {
                store.setState(
                    result.error === 'disconnect-failed'
                        ? {
                              status: 'disconnect-failed',
                              message: 'Could not close the connection. Profile kept. Retry deletion or Disconnect.',
                          }
                        : { message: profileMessages[result.error] }
                );
                return false;
            }
            const index = state.profiles.findIndex((item) => item.id === id);
            store.setState({
                profiles: result.value,
                selectedId: result.value[Math.min(index, result.value.length - 1)]?.id ?? null,
                message: 'Profile deleted. Database and data are unchanged.',
            });
            return true;
        } catch (error) {
            onError(error);
            return false;
        } finally {
            if (alive.current) store.setState({ operation: 'idle' });
        }
    };

    return { store, session, load, save, connect, disconnect, remove };
};
