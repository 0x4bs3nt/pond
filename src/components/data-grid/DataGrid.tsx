import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { GridHeader } from './rendering/GridHeader';
import { GridBody } from './rendering/GridBody';
import { clamp, layoutColumns, revealCell, visibleColumns } from './layout';
import { useGridKeyboard } from './use-grid-keyboard';
import type { CellPosition, DataGridProps, GridViewport } from './types';

export const DataGrid = ({
    columns,
    rows,
    width,
    height,
    getInteraction,
    selection,
    onSelect,
    onFocus,
    onEdit,
}: DataGridProps) => {
    const focused = getInteraction() === 'focused';
    const positioned = useMemo(() => layoutColumns(columns), [columns]);

    const bodyHeight = Math.max(1, height - 2);
    const gutter = Math.max(6, String(rows.length).length + 2);
    const contentWidth = Math.max(1, width - gutter);
    const last = positioned.at(-1);
    const totalWidth = last ? last.left + last.width : 0;

    const [viewport, setViewport] = useState<GridViewport>({ top: 0, left: 0 });
    const selectionRef = useRef(selection);

    const selectCell = (next: CellPosition) => {
        if (getInteraction() === 'disabled') return;

        selectionRef.current = next;
        onSelect(next);
    };

    const top = clamp(viewport.top, rows.length - bodyHeight);
    const left = clamp(viewport.left, totalWidth - contentWidth);
    const visible = useMemo(() => visibleColumns(positioned, left, contentWidth), [positioned, left, contentWidth]);

    useLayoutEffect(() => {
        selectionRef.current = selection;
        setViewport((current) => {
            const next = revealCell(current, selection, positioned, rows.length, contentWidth, bodyHeight);
            return next.top === current.top && next.left === current.left ? current : next;
        });
    }, [selection, positioned, rows.length, contentWidth, bodyHeight]);

    useGridKeyboard({
        getInteraction,
        getSelection: () => selectionRef.current,
        rowCount: rows.length,
        columnCount: columns.length,
        pageSize: bodyHeight,
        onSelect: selectCell,
        onEdit,
    });

    return (
        <box
            width={width}
            height={height}
            flexShrink={0}
            overflow="hidden"
            flexDirection="column"
            onMouseDown={() => {
                if (getInteraction() !== 'disabled') onFocus();
            }}
            onMouseScroll={(event) => {
                if (getInteraction() === 'disabled') return;

                const direction = event.scroll?.direction;
                const horizontal = event.modifiers.shift || direction === 'left' || direction === 'right';
                const delta = direction === 'up' || direction === 'left' ? -3 : 3;
                setViewport((current) => ({
                    top: horizontal ? current.top : clamp(current.top + delta, rows.length - bodyHeight),
                    left: horizontal ? clamp(current.left + delta, totalWidth - contentWidth) : current.left,
                }));
                event.stopPropagation();
            }}
        >
            <GridHeader columns={visible} left={left} width={contentWidth} gutter={gutter} focused={focused} />
            <GridBody
                columns={visible}
                rows={rows.slice(top, top + bodyHeight)}
                top={top}
                left={left}
                width={contentWidth}
                height={bodyHeight}
                gutter={gutter}
                selection={selection}
                focused={focused}
                onSelect={selectCell}
            />
        </box>
    );
};
