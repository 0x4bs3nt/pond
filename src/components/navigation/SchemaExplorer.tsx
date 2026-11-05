import { memo, useLayoutEffect, useMemo, useState } from 'react';
import type { ExplorerEntry, SchemaExplorerProps } from './types';

import { theme } from '../../theme';

export const SchemaExplorer = memo(
    ({
        groups,
        databaseName = 'pond_demo',
        message,
        footer = 'LOCAL DEMO\nDemo data only',
        activeId,
        cursor,
        focused,
        width,
        height,
        onOpen,
    }: SchemaExplorerProps) => {
        const [scrollTop, setScrollTop] = useState(0);

        const entries = useMemo(() => {
            const rows: ExplorerEntry[] = [];
            let index = 0;

            for (const group of groups) {
                rows.push({ id: `namespace:${group.id}`, label: group.name });
                rows.push({ id: `spacer:${group.id}`, label: '' });

                for (const table of group.tables) rows.push({ id: table.id, table, index: index++ });

                if (!group.tables.length) rows.push({ id: `empty:${group.id}`, label: '  (empty schema)' });
            }

            return rows;
        }, [groups]);

        const visible = Math.max(1, height - 5);
        const maxTop = Math.max(0, entries.length - visible);
        const top = Math.min(scrollTop, maxTop);

        useLayoutEffect(() => {
            const row = entries.findIndex((entry) => 'index' in entry && entry.index === cursor);

            if (!focused || row < 0) return;
            setScrollTop((current) => Math.max(0, Math.min(row, Math.max(current, row - visible + 1))));
        }, [cursor, entries, focused, visible]);

        return (
            <box
                width={width}
                height={height}
                flexShrink={0}
                flexDirection="column"
                backgroundColor={theme.panel}
                border={['right']}
                borderColor={focused ? theme.accent : theme.border}
                overflow="hidden"
            >
                <text height={2} fg={focused ? theme.accent : theme.muted}>
                    {' EXPLORER'}
                </text>
                <text height={1} fg={theme.text}>
                    {` ● ${databaseName}`}
                </text>
                <box
                    height={visible}
                    flexShrink={0}
                    flexDirection="column"
                    overflow="hidden"
                    onMouseScroll={(event) => {
                        const direction = event.scroll?.direction;
                        if (direction !== 'up' && direction !== 'down') return;
                        setScrollTop((current) =>
                            Math.max(0, Math.min(maxTop, current + (direction === 'up' ? -3 : 3)))
                        );
                        event.stopPropagation();
                    }}
                >
                    {message && <text fg={theme.muted}>{message}</text>}
                    {entries.slice(top, top + visible).map((entry) =>
                        'label' in entry ? (
                            <text key={entry.id} height={1} flexShrink={0} fg={theme.muted} wrapMode="none">
                                {entry.label ? ` └ ${entry.label}` : ''}
                            </text>
                        ) : (
                            <text
                                key={entry.id}
                                height={1}
                                flexShrink={0}
                                wrapMode="none"
                                selectable={false}
                                bg={
                                    focused && cursor === entry.index
                                        ? theme.selection
                                        : activeId === entry.table.id
                                          ? theme.raised
                                          : undefined
                                }
                                fg={activeId === entry.table.id ? theme.accent : theme.text}
                                onMouseDown={(event) => {
                                    if (event.button === 0) onOpen(entry.index);
                                }}
                            >
                                {`  ${activeId === entry.table.id ? '▸' : ' '} ${entry.table.name}${entry.table.kind && entry.table.kind !== 'table' ? ` [${entry.table.kind}]` : ''}`}
                            </text>
                        )
                    )}
                </box>
                <text height={2} fg={theme.muted} wrapMode="none">
                    {footer}
                </text>
            </box>
        );
    }
);
