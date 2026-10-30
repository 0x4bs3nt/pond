import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useKeyboard } from '@opentui/react';

import { GridHeader } from './rendering/GridHeader';
import { GridBody } from './rendering/GridBody';
import { clamp, layoutColumns, revealCell, visibleColumns } from './layout';
import { moveSelection } from './navigation/move-selection';
import type { CellPosition, DataGridProps, GridViewport } from './types';

export const DataGrid = ({ columns, rows, width, height, focused, selection, onSelect, onFocus }: DataGridProps) => {
    const positioned = useMemo(() => layoutColumns(columns), [columns]);

    const bodyHeight = Math.max(1, height - 2);
    const gutter = 6;
    const contentWidth = Math.max(1, width - gutter);
    const last = positioned.at(-1);
    const totalWidth = last ? last.left + last.width : 0;

    const [viewport, setViewport] = useState<GridViewport>({ top: 0, left: 0 });
    const selectionRef = useRef(selection);

    const selectCell = (next: CellPosition) => {
        selectionRef.current = next;
        onSelect(next);
    };

    const top = clamp(viewport.top, rows.length - bodyHeight);
    const left = clamp(viewport.left, totalWidth - contentWidth);
    const visible = useMemo(() => visibleColumns(positioned, left, contentWidth), [positioned, left, contentWidth]);

    useLayoutEffect(() => {
        selectionRef.current = selection;
        setViewport((current) => revealCell(current, selection, positioned, rows.length, contentWidth, bodyHeight));
    }, [selection, positioned, rows.length, contentWidth, bodyHeight]);

    useKeyboard((key) => {
        if (!focused || rows.length === 0 || key.meta) return;

        const next = moveSelection(selectionRef.current, key.name, key.ctrl, rows.length, columns.length, bodyHeight);

        if (next) {
            key.preventDefault();
            selectCell(next);
        }
    });

    return (
        <box
            width={width}
            height={height}
            flexShrink={0}
            overflow="hidden"
            flexDirection="column"
            onMouseDown={onFocus}
            onMouseScroll={(event) => {
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
