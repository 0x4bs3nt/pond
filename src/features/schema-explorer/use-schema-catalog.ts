import { useCallback, useEffect, useRef, useState } from 'react';
import type { DatabaseTable } from '../../domain/database';
import { discoverSchema, describeTable } from '../../services/schema';
import { readTable } from '../../services/database';
import { createSchemaExplorerStore } from '../../state/schema-explorer';
import type { DatabaseExplorerProps } from './types';

export const useSchemaCatalog = ({ session, onError }: Pick<DatabaseExplorerProps, 'session' | 'onError'>) => {
    const [store] = useState(createSchemaExplorerStore);
    const catalogRequest = useRef(0);
    const tableRequest = useRef(0);
    const reading = useRef(false);
    const pending = useRef<(() => Promise<void>) | null>(null);

    const refresh = useCallback(async () => {
        const request = ++catalogRequest.current;

        tableRequest.current++;
        pending.current = null;
        store.setState({
            catalog: { status: 'loading' },
            selected: null,
            data: { status: 'idle' },
            description: { status: 'idle' },
        });

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

    const load = async (table: DatabaseTable, request: number) => {
        const result = await readTable(session, {
            table,
            offset: 0,
            limit: Math.min(100, session.capabilities.maxPageSize),
        });

        if (request !== tableRequest.current) return;
        if (result.ok) {
            store.setState({
                data: { status: 'ready', value: result.value },
                description: { status: 'ready', value: result.value.schema },
            });
        } else {
            store.setState({ data: { status: 'error', error: result.error } });

            // Metadata can remain accessible even when SELECT on all columns is denied.
            const description = await describeTable(session, table);
            if (request !== tableRequest.current) return;

            store.setState({
                description: description.ok
                    ? { status: 'ready', value: description.value }
                    : { status: 'error', error: description.error },
            });
        }
    };

    const select = async (table: DatabaseTable) => {
        const state = store.getState();

        if (state.catalog.status !== 'ready') return;
        if (
            state.selected?.id === table.id &&
            (state.data.status === 'loading' || state.description.status === 'loading')
        )
            return;

        const request = ++tableRequest.current;
        store.setState({ selected: table, data: { status: 'loading' }, description: { status: 'loading' } });

        // Keep only the latest selection while the current read finishes its transaction.
        pending.current = () => load(table, request);
        if (reading.current) return;

        reading.current = true;
        try {
            while (pending.current) {
                const next = pending.current;
                pending.current = null;
                await next();
            }
        } catch (error) {
            pending.current = null;
            onError(error);
        } finally {
            reading.current = false;
        }
    };

    useEffect(() => {
        void refresh();
        return () => {
            catalogRequest.current++;
            tableRequest.current++;
            pending.current = null;
        };
    }, [refresh]);

    return { store, refresh, select };
};
