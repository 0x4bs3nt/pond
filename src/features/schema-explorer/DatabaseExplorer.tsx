import { useRef, useState } from 'react';
import { useTerminalDimensions } from '@opentui/react';
import { useStore } from 'zustand';
import { SchemaExplorer as ExplorerView } from '../../components/navigation';
import { theme } from '../../theme';
import { useSchemaCatalog } from './use-schema-catalog';
import { useExplorerKeyboard } from './use-explorer-keyboard';
import { useCatalogKeyboard } from './use-catalog-keyboard';
import { TableStructure } from './TableStructure';
import { schemaErrorMessage } from './messages';
import type { DatabaseExplorerProps } from './types';

export const DatabaseExplorer = (props: DatabaseExplorerProps) => {
    const isActive = props.isActive ?? (() => true);
    const { width, height } = useTerminalDimensions();

    const { store, refresh, select } = useSchemaCatalog(props);

    const catalog = useStore(store, (state) => state.catalog);
    const selected = useStore(store, (state) => state.selected);
    const description = useStore(store, (state) => state.description);

    const [cursor, setCursor] = useState(0);
    const cursorRef = useRef(0);
    const [focused, setFocused] = useState(true);

    const groups = catalog.status === 'ready' ? catalog.value : [];
    const tables = groups.flatMap((group) => group.tables);

    const sidebarWidth = width >= 90 ? 30 : 22;

    const open = (index: number) => {
        const table = tables[index];
        if (!isActive() || !table) return;

        cursorRef.current = index;
        setCursor(index);
        setFocused(true);

        void select(table);
    };

    const reload = () => {
        if (!isActive() || catalog.status === 'loading') return;

        cursorRef.current = 0;
        setCursor(0);

        void refresh();
    };

    useExplorerKeyboard({
        focused,
        isActive,
        moveCursor: (offset) => {
            cursorRef.current = Math.max(0, Math.min(tables.length - 1, cursorRef.current + offset));
            setCursor(cursorRef.current);
        },
        openSelected: () => open(cursorRef.current),
    });

    useCatalogKeyboard({
        isActive,
        onConnections: props.onConnections,
        onRefresh: reload,
        onDisconnect: props.onDisconnect,
        onToggleFocus: () => setFocused((value) => !value),
    });

    if (width < 60 || height < 16)
        return <text fg={theme.accent}>Resize terminal to at least 60 × 16. Ctrl+C quits.</text>;

    const message =
        catalog.status === 'loading'
            ? 'Loading schemas…'
            : catalog.status === 'error'
              ? schemaErrorMessage(catalog.error)
              : !groups.length
                ? 'No accessible schemas.'
                : undefined;

    return (
        <box width={width} height={height} flexDirection="column" backgroundColor={theme.background}>
            <text height={1} fg={theme.accent}>{` POND / Schema explorer · Connected to ${props.databaseName}`}</text>
            <box height={1} flexDirection="row">
                {props.onConnections && (
                    <text
                        fg={theme.accent}
                        onMouseDown={() => {
                            if (isActive()) props.onConnections?.();
                        }}
                    >
                        {' '}
                        F2 Connections{' '}
                    </text>
                )}
                <text fg={theme.muted} onMouseDown={reload}>
                    {' '}
                    F5 Refresh{' '}
                </text>
                <text
                    fg={theme.muted}
                    onMouseDown={() => {
                        if (isActive()) props.onDisconnect();
                    }}
                >
                    {' '}
                    Ctrl+D Disconnect{' '}
                </text>
                <text fg={theme.muted}> Ctrl+C Quit </text>
            </box>
            <box height={height - 3} flexDirection="row">
                <ExplorerView
                    groups={groups.map((group) => ({
                        id: JSON.stringify(group.namespace),
                        name: group.namespace.map((part) => JSON.stringify(part)).join('.'),
                        tables: group.tables,
                    }))}
                    databaseName={props.databaseName}
                    message={message}
                    footer={'Enter inspect\nTab switch focus'}
                    activeId={selected?.id ?? ''}
                    cursor={cursor}
                    focused={focused}
                    width={sidebarWidth}
                    height={height - 3}
                    onOpen={open}
                />
                <box width={width - sidebarWidth} height={height - 3} flexDirection="column">
                    {description.status === 'ready' ? (
                        <TableStructure
                            key={description.value.table.id}
                            schema={description.value}
                            width={width - sidebarWidth}
                            height={height - 3}
                            focused={!focused}
                            isActive={isActive}
                            onFocus={() => setFocused(false)}
                        />
                    ) : (
                        <text fg={theme.muted}>
                            {description.status === 'loading'
                                ? 'Loading columns…'
                                : description.status === 'error'
                                  ? schemaErrorMessage(description.error)
                                  : 'Select a table or view and press Enter to inspect its columns.'}
                        </text>
                    )}
                </box>
            </box>
            <text height={1} fg={theme.muted}>
                {' '}
                Arrows navigate · Enter inspect · Tab switch focus · F5 refresh
            </text>
        </box>
    );
};
