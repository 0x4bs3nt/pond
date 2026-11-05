import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatabaseTable } from '../../domain/database';
import { discoverSchema, describeTable } from '../../services/schema';
import { createSchemaExplorerStore } from '../../state/schema-explorer';
import type { DatabaseExplorerProps } from './types';

export const useSchemaCatalog = ({ session, onError }: Pick<DatabaseExplorerProps, 'session' | 'onError'>) => {
    const [store] = useState(createSchemaExplorerStore);
    const catalogRequest = useRef(0);
    const descriptionRequest = useRef(0);

    const refresh = useCallback(async () => {
        const request = ++catalogRequest.current;

        descriptionRequest.current++;
        store.setState({ catalog: { status: 'loading' }, selected: null, description: { status: 'idle' } });

        try {
            const result = await discoverSchema(session);

            if (request !== catalogRequest.current) return;
            store.setState({
                catalog: result.ok
                    ? { status: 'ready', value: result.value }
                    : { status: 'error', error: result.error },
            });
        } catch (error) {
            onError(error);
        }
    }, [session, store, onError]);

    const select = async (table: DatabaseTable) => {
        if (store.getState().catalog.status !== 'ready') return;

        const request = ++descriptionRequest.current;
        store.setState({ selected: table, description: { status: 'loading' } });

        try {
            const result = await describeTable(session, table);
            if (request !== descriptionRequest.current) return;
            store.setState({
                description: result.ok
                    ? { status: 'ready', value: result.value }
                    : { status: 'error', error: result.error },
            });
        } catch (error) {
            onError(error);
        }
    };

    useEffect(() => {
        void refresh();
        return () => {
            catalogRequest.current++;
            descriptionRequest.current++;
        };
    }, [refresh]);

    return { store, refresh, select };
};
