import { useRef, useState } from 'react';
import { SelectableList } from '../../src/components/navigation';
import { theme } from '../../src/theme';
import { useExplorerScenarioKeyboard } from './use-gallery-keyboard';
import type { ListScenarioProps } from './types';

export const ListScenario = ({ items, message, disabled, height }: ListScenarioProps) => {
    const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
    const cursor = useRef(0);
    const [focused, setFocused] = useState(true);
    const select = (id: string) => {
        if (disabled) return;
        cursor.current = items.findIndex((item) => item.id === id);
        setSelectedId(id);
        setFocused(true);
    };
    useExplorerScenarioKeyboard({
        focused: focused && !disabled,
        onMove: (offset) => {
            const index = Math.max(0, Math.min(items.length - 1, cursor.current + offset));
            if (items[index]) select(items[index].id);
        },
        onOpen: () => {},
        onToggleFocus: () => setFocused((value) => !value),
    });
    return (
        <box height={height} flexDirection="column">
            <SelectableList
                items={items}
                message={message}
                disabled={disabled}
                selectedId={selectedId}
                height={height - 1}
                onSelect={select}
            />
            <text
                height={1}
                fg={theme.muted}
            >{`Focus: ${focused ? 'list' : 'outside'} · Selected: ${selectedId ?? '(none)'}`}</text>
        </box>
    );
};
