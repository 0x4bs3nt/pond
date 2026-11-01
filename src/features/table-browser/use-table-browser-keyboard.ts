import { useKeyboard } from '@opentui/react';

type TableBrowserKeyboardOptions = {
    focused: boolean;
    isEditing: () => boolean;
    onDiscard: () => void;
};

export const useTableBrowserKeyboard = ({ focused, isEditing, onDiscard }: TableBrowserKeyboardOptions) => {
    useKeyboard((key) => {
        if (!focused || isEditing() || key.defaultPrevented) return;
        if (key.ctrl && key.name === 'd') {
            key.preventDefault();
            onDiscard();
        }
    });
};
