import { useKeyboard, useRenderer } from '@opentui/react';

export const useErrorKeyboard = () => {
    const renderer = useRenderer();
    useKeyboard((key) => {
        if ((key.name === 'q' && !key.ctrl && !key.meta) || (key.ctrl && key.name === 'c')) {
            key.preventDefault();
            renderer.destroy();
        }
    });
};
