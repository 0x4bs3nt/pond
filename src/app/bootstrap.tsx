import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './App';

const renderer = await createCliRenderer({ exitOnCtrlC: true });

try {
    createRoot(renderer).render(<App />);
} catch (error) {
    renderer.destroy();
    await renderer.closed;
    throw error;
}
