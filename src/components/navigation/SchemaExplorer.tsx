import { memo } from 'react';

import { theme } from '../../theme';

type SchemaExplorerProps = {
    tables: readonly { id: string; name: string }[];
    activeId: string;
    cursor: number;
    focused: boolean;
    width: number;
    height: number;
    onOpen: (index: number) => void;
};

export const SchemaExplorer = memo(
    ({ tables, activeId, cursor, focused, width, height, onOpen }: SchemaExplorerProps) => (
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
                {' ● pond_demo'}
            </text>
            <text height={2} fg={theme.muted}>
                {'   └ public'}
            </text>
            {tables.map((table, index) => (
                <text
                    key={table.id}
                    height={1}
                    selectable={false}
                    bg={
                        focused && cursor === index ? theme.selection : activeId === table.id ? theme.raised : undefined
                    }
                    fg={activeId === table.id ? theme.accent : theme.text}
                    onMouseDown={(event) => {
                        if (event.button === 0) onOpen(index);
                    }}
                >
                    {`    ${activeId === table.id ? '▸' : ' '} ${table.name}`}
                </text>
            ))}
            <box flexGrow={1} />
            <text height={2} fg={theme.muted} wrapMode="none">
                {' LOCAL DEMO\n Demo data only'}
            </text>
        </box>
    )
);
