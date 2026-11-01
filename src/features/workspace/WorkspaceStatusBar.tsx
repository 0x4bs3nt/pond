import { KeyboardHints, type KeyboardHint } from '../../components/feedback';

import { useWorkspace } from './WorkspaceProvider';

type StatusMode = 'editing' | 'grid' | 'explorer';

const modes: Record<StatusMode, { label?: string; hints: readonly KeyboardHint[] }> = {
    editing: {
        label: 'Editing',
        hints: [
            { keys: 'Esc', action: 'cancel' },
            { keys: 'Ctrl+S', action: 'stage' },
            { keys: 'Ctrl+N', action: 'NULL' },
        ],
    },
    grid: {
        hints: [
            { keys: 'Enter', action: 'edit' },
            { keys: 'Ctrl+D', action: 'discard' },
            { keys: 'Tab', action: 'explorer' },
            { keys: '↑↓←→', action: 'move' },
            { keys: 'q', action: 'quit' },
        ],
    },
    explorer: {
        hints: [
            { keys: 'Tab', action: 'grid' },
            { keys: '↑↓', action: 'select table' },
            { keys: 'Enter', action: 'open' },
            { keys: 'q', action: 'quit' },
        ],
    },
};

export const WorkspaceStatusBar = () => {
    const mode = useWorkspace((state): StatusMode => (state.editing ? 'editing' : state.focus));

    return <KeyboardHints {...modes[mode]} />;
};
