import { useRef, useState } from 'react';
import { SchemaExplorer } from '../../src/components/navigation';
import { theme } from '../../src/theme';
import { useExplorerScenarioKeyboard } from './use-gallery-keyboard';
import type { ExplorerScenarioProps } from './types';

export const ExplorerScenario = ({ groups, message, width, height }: ExplorerScenarioProps) => {
    const [cursor, setCursor] = useState(0);
    const cursorRef = useRef(0);
    const [active, setActive] = useState('');
    const [focused, setFocused] = useState(true);

    const tables = groups.flatMap((group) => group.tables);

    const open = (index: number) => {
        const table = tables[index];
        if (!table) return;

        cursorRef.current = index;
        setCursor(index);
        setActive(table.id);
        setFocused(true);
    };

    useExplorerScenarioKeyboard({
        focused,
        onMove: (offset) => {
            cursorRef.current = Math.max(0, Math.min(tables.length - 1, cursorRef.current + offset));
            setCursor(cursorRef.current);
        },
        onOpen: () => open(cursorRef.current),
        onToggleFocus: () => setFocused((value) => !value),
    });

    return (
        <box width={width} height={height} flexDirection="row">
            <SchemaExplorer
                groups={groups}
                databaseName="gallery"
                message={message}
                footer="Mock catalog"
                activeId={active}
                cursor={cursor}
                focused={focused}
                width={32}
                height={height}
                onOpen={open}
            />
            <text width={width - 32} fg={theme.text} wrapMode="char">
                {`Arrows, Enter, mouse and wheel navigate. Tab changes focus.\nSelected: ${tables.find((table) => table.id === active)?.name ?? '(none)'}`}
            </text>
        </box>
    );
};
