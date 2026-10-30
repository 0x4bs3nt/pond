import { useKeyboard } from '@opentui/react';

type ExplorerKeyboardOptions = {
    focused: boolean;
    moveCursor: (offset: number) => void;
    openSelected: () => void;
};

export const useExplorerKeyboard = ({ focused, moveCursor, openSelected }: ExplorerKeyboardOptions) => {
    useKeyboard((key) => {
        if (!focused) return;

        switch (key.name) {
            case 'up':
                key.preventDefault();
                moveCursor(-1);
                break;
            case 'down':
                key.preventDefault();
                moveCursor(1);
                break;
            case 'return':
                key.preventDefault();
                openSelected();
                break;
        }
    });
};
