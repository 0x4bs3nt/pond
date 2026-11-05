import { useKeyboard, useRenderer } from '@opentui/react';
import type { ExplorerScenarioKeyboardOptions, GalleryKeyboardOptions, ScenarioKeyboardOptions } from './types';

export const useExplorerScenarioKeyboard = ({
    onMove,
    onOpen,
    onToggleFocus,
    focused,
}: ExplorerScenarioKeyboardOptions) => {
    useKeyboard((key) => {
        if (key.defaultPrevented) return;
        if (key.name === 'tab') {
            key.preventDefault();
            onToggleFocus();
        } else if (focused && key.name === 'up') {
            key.preventDefault();
            onMove(-1);
        } else if (focused && key.name === 'down') {
            key.preventDefault();
            onMove(1);
        } else if (focused && key.name === 'return') {
            key.preventDefault();
            onOpen();
        }
    });
};

export const useGalleryKeyboard = ({ isEditing, onPrevious, onNext, onReset }: GalleryKeyboardOptions) => {
    const renderer = useRenderer();
    useKeyboard((key) => {
        if (isEditing() || key.defaultPrevented || key.ctrl || key.meta) return;
        switch (key.name) {
            case 'f5':
                key.preventDefault();
                onPrevious();
                break;
            case 'f6':
                key.preventDefault();
                onNext();
                break;
            case 'r':
                key.preventDefault();
                onReset();
                break;
            case 'q':
                key.preventDefault();
                renderer.destroy();
                break;
        }
    });
};

export const useScenarioKeyboard = ({
    isEditing,
    onOpen,
    getSelection,
    onDiscard,
    editorOnly,
}: ScenarioKeyboardOptions) => {
    useKeyboard((key) => {
        if (isEditing() || key.defaultPrevented || key.meta) return;
        if (key.ctrl && key.name === 'd') {
            key.preventDefault();
            onDiscard();
        } else if (editorOnly && key.name === 'return' && !key.ctrl) {
            key.preventDefault();
            onOpen(getSelection());
        }
    });
};
