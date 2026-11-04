import { useEffect, useRef, useState } from 'react';
import { copyProfile, type ConnectionProfile } from '../../domain/connections';
import { createConnectionStore } from '../../state/connections';
import { connectionMessages, profileMessages } from './messages';
import type { ConnectionDependencies } from './types';

export const useConnectionActions = ({ profiles, credentials, connections, onError }: ConnectionDependencies) => {
    const [store] = useState(createConnectionStore);

    const alive = useRef(true);
    const request = useRef(0);
    const unsubscribe = useRef<(() => void) | undefined>(undefined);
    const saving = useRef(false);
    const profileRequest = useRef(0);

    useEffect(() => {
        alive.current = true;

        const current = ++profileRequest.current;
        void profiles
            .list()
            .then((result) => {
                if (!alive.current || current !== profileRequest.current) return;
                store.setState(result.ok ? { profiles: result.value } : { message: profileMessages[result.error] });
            })
            .catch(onError);

        return () => {
            alive.current = false;
            request.current++;
            unsubscribe.current?.();
            credentials.clear();
            void connections.disconnect().catch(onError);
        };
    }, [profiles, credentials, connections, onError, store]);

    const save = async (profile: ConnectionProfile) => {
        if (saving.current) return;

        saving.current = true;
        profileRequest.current++;
        store.setState({ message: 'Saving profile…' });

        try {
            const result = await profiles.save(profile);

            if (alive.current)
                store.setState(
                    result.ok
                        ? { profiles: result.value, message: 'Profile saved. Passwords are never saved.' }
                        : { message: profileMessages[result.error] }
                );
        } catch (error) {
            onError(error);
        } finally {
            saving.current = false;
        }
    };

    const connect = async (profile: ConnectionProfile, password: string) => {
        const current = ++request.current;

        unsubscribe.current?.();
        credentials.setPassword(profile.id, password);
        store.setState({ status: 'connecting', activeProfile: null, message: 'Connecting… Esc cancels.' });

        try {
            const result = await connections.connect(copyProfile(profile));

            if (!alive.current || current !== request.current) return;
            if (!result.ok) {
                store.setState({ status: 'disconnected', message: connectionMessages[result.error.code] });

                return;
            }

            store.setState({
                status: 'connected',
                activeProfile: profile,
                message: 'Connected. Table browsing is coming next.',
            });

            unsubscribe.current = result.value.subscribeClose(() => {
                if (alive.current && current === request.current)
                    store.setState({ status: 'disconnected', activeProfile: null, message: connectionMessages.closed });
            });
        } catch (error) {
            onError(error);
        }
    };

    const disconnect = async () => {
        const current = ++request.current;

        unsubscribe.current?.();
        unsubscribe.current = undefined;

        store.setState({ status: 'disconnecting', activeProfile: null, message: 'Disconnecting…' });

        try {
            await connections.disconnect();
            if (alive.current && current === request.current)
                store.setState({ status: 'disconnected', message: 'Disconnected.' });
        } catch (error) {
            onError(error);
        }
    };

    return { store, save, connect, disconnect };
};
