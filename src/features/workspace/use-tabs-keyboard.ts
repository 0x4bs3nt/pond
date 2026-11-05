import { useKeyboard } from '@opentui/react';
import { useWorkspaceStore } from './WorkspaceProvider';
import type { TabsKeyboardOptions } from './types';

export const useTabsKeyboard = ({ onClose }: TabsKeyboardOptions) => {
    const store = useWorkspaceStore();
    useKeyboard((key) => {
        const state = store.getState();
        if (!state.isActive() || state.editing || key.defaultPrevented || key.meta) return;
        if (key.ctrl && key.name === 'w') {
            key.preventDefault();
            if (state.activeTableId) onClose(state.activeTableId);
            return;
        }
        if (state.focus !== 'tabs' || key.ctrl) return;

        const index = state.openTableIds.indexOf(state.activeTableId ?? '');
        let target: string | undefined;

        switch (key.name) {
            case 'left':
                target = state.openTableIds[Math.max(0, index - 1)];
                break;
            case 'right':
                target = state.openTableIds[Math.min(state.openTableIds.length - 1, index + 1)];
                break;
            case 'home':
                target = state.openTableIds[0];
                break;
            case 'end':
                target = state.openTableIds.at(-1);
                break;
            case 'return':
                key.preventDefault();
                state.focusPanel('grid');
                return;
            case 'delete':
                key.preventDefault();
                if (state.activeTableId) onClose(state.activeTableId);
                return;
            default:
                return;
        }
        key.preventDefault();
        if (target) state.activateTab(target);
    });
};
