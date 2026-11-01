import { useCallback, useRef, useState } from 'react';
import type { SchemaExplorerProps } from './types';

import { SchemaExplorer as SchemaExplorerView } from '../../components/navigation';
import { useWorkspace } from '../workspace';
import { useExplorerKeyboard } from './use-explorer-keyboard';

export const SchemaExplorer = ({ tables, width, height }: SchemaExplorerProps) => {
    const activeTableId = useWorkspace((state) => state.activeTableId);
    const focused = useWorkspace((state) => state.focus === 'explorer');
    const openTable = useWorkspace((state) => state.openTable);
    const isEditing = useWorkspace((state) => state.isEditing);

    const [cursor, setCursor] = useState(0);
    const cursorRef = useRef(0);

    const moveCursor = useCallback(
        (offset: number) => {
            const next = Math.max(0, Math.min(tables.length - 1, cursorRef.current + offset));

            cursorRef.current = next;
            setCursor(next);
        },
        [tables.length]
    );

    const openAtIndex = useCallback(
        (index: number) => {
            if (isEditing()) return;
            const table = tables[index];
            if (!table) return;

            cursorRef.current = index;
            setCursor(index);
            openTable(table.id);
        },
        [tables, openTable, isEditing]
    );
    const openSelected = useCallback(() => openAtIndex(cursorRef.current), [openAtIndex]);

    useExplorerKeyboard({ focused, moveCursor, openSelected });

    return (
        <SchemaExplorerView
            tables={tables}
            activeId={activeTableId ?? ''}
            cursor={cursor}
            focused={focused}
            width={width}
            height={height}
            onOpen={openAtIndex}
        />
    );
};
