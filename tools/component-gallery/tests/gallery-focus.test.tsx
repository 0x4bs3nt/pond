import { testRender } from '@opentui/react/test-utils';
import { expect, test } from 'bun:test';
import { act } from 'react';
import { Gallery } from '../Gallery';

test.each(['F6', 'r'])('%s followed by editor input in one batch does not strand gallery focus', async (key) => {
    const view = await testRender(<Gallery initialScenario="single-line" palette="default" />, {
        width: 100,
        height: 30,
    });
    try {
        await view.renderOnce();
        await act(async () => {
            view.mockInput.pressKey(key);
            if (key === 'F6') view.mockInput.pressEnter();
            else view.mockMouse.click(6, 5);
        });
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain(key === 'F6' ? 'Multiline editor' : 'Single-line editor');
        expect(view.captureCharFrame()).not.toContain('Editing · Esc cancel');

        // Navigation and the new instance's editor must both still work.
        await act(async () => view.mockInput.pressKey('F6'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain(key === 'F6' ? 'JSON editor' : 'Multiline editor');
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Editing · Esc cancel');
        await act(async () => view.mockInput.pressKey('\u001b[27u'));
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('Editing · Esc cancel');
    } finally {
        await act(async () => view.dispose());
    }
});
