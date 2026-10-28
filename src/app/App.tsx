import { useKeyboard, useRenderer } from '@opentui/react';

export const App = () => {
    const renderer = useRenderer();

    useKeyboard((key) => {
        if (key.name === 'q') renderer.destroy();
    });

    return (
        <box flexDirection="column" padding={1} gap={1}>
            <text fg="#7dd3fc">Pond</text>
            <text>A terminal database manager.</text>
            <text fg="#94a3b8">Press q or Ctrl+C to quit.</text>
        </box>
    );
};
