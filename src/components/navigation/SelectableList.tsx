import { theme } from '../../theme';
import type { SelectableListProps } from './types';

export const SelectableList = ({ items, selectedId, height, disabled, message, onSelect }: SelectableListProps) => {
    const index = Math.max(
        0,
        items.findIndex((item) => item.id === selectedId)
    );
    const count = Math.max(1, Math.floor(height / 2));
    const start = Math.max(0, Math.min(index - count + 1, items.length - count));

    return (
        <box
            height={height}
            flexShrink={0}
            flexDirection="column"
            onMouseScroll={(event) => {
                if (disabled || !items.length || !['up', 'down'].includes(event.scroll?.direction ?? '')) return;
                const next = Math.max(
                    0,
                    Math.min(items.length - 1, index + (event.scroll?.direction === 'up' ? -1 : 1))
                );
                onSelect(items[next]!.id);
            }}
        >
            {message ? (
                <text fg={theme.muted}>{message}</text>
            ) : (
                items.slice(start, start + count).map((item) => (
                    <box
                        key={item.id}
                        height={2}
                        flexShrink={0}
                        flexDirection="column"
                        backgroundColor={item.id === selectedId ? theme.panel : theme.background}
                        onMouseDown={() => {
                            if (!disabled) onSelect(item.id);
                        }}
                    >
                        <text
                            height={1}
                            wrapMode="none"
                            fg={disabled ? theme.muted : item.id === selectedId ? theme.accent : theme.text}
                        >
                            {`${item.id === selectedId ? '›' : ' '} ${item.label}`}
                        </text>
                        <text height={1} wrapMode="none" fg={theme.muted}>{`  ${item.detail}`}</text>
                    </box>
                ))
            )}
        </box>
    );
};
