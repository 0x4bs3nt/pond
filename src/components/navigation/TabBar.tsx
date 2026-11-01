import { theme } from '../../theme';
import type { TabBarProps } from './types';

export const TabBar = ({ tabs, activeId, focused, width, onActivate, onClose }: TabBarProps) => {
    const capacity = Math.max(1, Math.floor((width - 6) / 18));
    const activeIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.id === activeId)
    );

    const start = Math.floor(activeIndex / capacity) * capacity;
    const visible = tabs.slice(start, start + capacity);
    const tabWidth = Math.max(4, Math.min(18, width - 6));
    const previous = tabs[start - 1];
    const next = tabs[start + capacity];

    return (
        <box
            width={width}
            height={1}
            flexShrink={0}
            flexDirection="row"
            backgroundColor={theme.panel}
            overflow="hidden"
        >
            <text
                width={3}
                fg={previous ? theme.accent : theme.border}
                selectable={false}
                onMouseDown={(event) => event.button === 0 && previous && onActivate(previous.id)}
            >
                {previous ? ' < ' : '   '}
            </text>
            {visible.map((tab) => (
                <box
                    key={tab.id}
                    width={tabWidth}
                    height={1}
                    flexShrink={0}
                    flexDirection="row"
                    backgroundColor={tab.id === activeId ? (focused ? theme.selection : theme.raised) : theme.panel}
                >
                    <text
                        width={tabWidth - 3}
                        height={1}
                        wrapMode="none"
                        selectable={false}
                        fg={tab.dirty ? theme.modified : tab.id === activeId ? theme.accent : theme.muted}
                        onMouseDown={(event) => event.button === 0 && onActivate(tab.id)}
                    >{` ${tab.dirty ? '*' : ''}${tab.label}`}</text>
                    <text
                        width={3}
                        selectable={false}
                        fg={theme.muted}
                        onMouseDown={(event) => event.button === 0 && onClose(tab.id)}
                    >
                        {' × '}
                    </text>
                </box>
            ))}
            <text
                width={3}
                fg={next ? theme.accent : theme.border}
                selectable={false}
                onMouseDown={(event) => event.button === 0 && next && onActivate(next.id)}
            >
                {next ? ' > ' : '   '}
            </text>
            {!tabs.length && <text fg={theme.muted}>No open tables</text>}
        </box>
    );
};
