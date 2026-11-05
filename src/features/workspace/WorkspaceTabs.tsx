import { useState } from 'react';
import { useStore } from 'zustand';
import { TabBar } from '../../components/navigation';
import { theme } from '../../theme';
import { useWorkspace, useWorkspaceStore } from './WorkspaceProvider';
import { useTabsKeyboard } from './use-tabs-keyboard';
import type { WorkspaceTabsProps } from './types';

export const WorkspaceTabs = ({ tables, sessions, width }: WorkspaceTabsProps) => {
    const store = useWorkspaceStore();

    const ids = useWorkspace((state) => state.openTableIds);
    const activeId = useWorkspace((state) => state.activeTableId);
    const focused = useWorkspace((state) => state.focus === 'tabs');
    const changes = useStore(sessions, (state) => state.changes);

    const [blockedId, setBlockedId] = useState<string | null>(null);

    const activate = (id: string) => {
        const state = store.getState();
        if (!state.isActive() || state.editing) return;

        state.activateTab(id);
        state.focusPanel('tabs');
        setBlockedId(null);
    };

    const close = (id: string) => {
        const state = store.getState();
        if (!state.isActive() || state.editing) return;

        if (Object.keys(sessions.getState().changes[id] ?? {}).length) {
            state.activateTab(id);
            state.focusPanel('grid');
            setBlockedId(id);

            return;
        }

        state.closeTab(id);
        setBlockedId(null);
    };

    useTabsKeyboard({ onClose: close });
    const blocked = blockedId === activeId && Object.keys(changes[blockedId ?? ''] ?? {}).length > 0;

    return (
        <box width={width} height={2} flexShrink={0} flexDirection="column">
            <TabBar
                tabs={ids.map((id) => ({
                    id,
                    label: tables.find((table) => table.id === id)?.name ?? id,
                    dirty: Object.keys(changes[id] ?? {}).length > 0,
                }))}
                activeId={activeId}
                focused={focused}
                width={width}
                onActivate={activate}
                onClose={close}
            />
            <text height={1} wrapMode="none" fg={blocked ? theme.modified : theme.muted}>
                {blocked ? ' Pending edits: Ctrl+D, then Ctrl+W.' : ' Ctrl+W close · * pending edits'}
            </text>
        </box>
    );
};
