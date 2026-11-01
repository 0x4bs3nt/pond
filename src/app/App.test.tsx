import { act } from 'react';

import { describe, expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import type { BaseRenderable } from '@opentui/core';

import { App } from './App';

const countNodes = (node: BaseRenderable): number =>
    1 + node.getChildren().reduce((sum, child) => sum + countNodes(child), 0);

describe('mock workspace', () => {
    test('retains every movement when key events arrive in one batch', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });

        try {
            await view.renderOnce();
            await act(async () => {
                for (let index = 0; index < 50; index++) view.mockInput.pressArrow('down');
                view.mockInput.pressArrow('right');
            });

            await view.renderOnce();

            expect(view.captureCharFrame()).toContain('Row 51 / 250  ·  name');
            expect(countNodes(view.renderer.root)).toBeLessThan(400);
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('navigates across rows and columns with a fixed header', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Mara Novak');
            expect(view.captureCharFrame()).toContain('Row 1 / 250');
            expect(view.captureCharFrame()).toContain('members   /   public');

            expect(countNodes(view.renderer.root)).toBeLessThan(400);
            await act(async () => view.mockInput.pressArrow('down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 2 / 250');
            await act(async () => view.mockInput.pressKey('\u001b[6~'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 15 / 250');
            await act(async () => view.mockInput.pressKey('END'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('settings');
            expect(view.captureCharFrame()).toContain('jsonb');
            await act(async () => view.mockInput.pressKey('END', { ctrl: true }));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 250 / 250');
            expect(countNodes(view.renderer.root)).toBeLessThan(400);
            expect(view.captureCharFrame()).toContain('settings');
            await act(async () => view.mockInput.pressArrow('down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 250 / 250');
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('preserves NULL, empty strings, Unicode, and exact numeric display values', async () => {
        const view = await testRender(<App />, { width: 120, height: 24 });
        try {
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('田中 花子');
            await act(async () => view.mockInput.pressArrow('right'));
            await act(async () => view.mockInput.pressArrow('right'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Value  NULL');
            for (let index = 0; index < 3; index++) await act(async () => view.mockInput.pressArrow('right'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Value  9007199254740993.25');
            await act(async () => view.mockInput.pressArrow('right'));
            await act(async () => view.mockInput.pressArrow('down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain("Value  '' (empty text)");
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('mouse selects cells and scrolls while the header stays visible', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            await act(async () => view.mockMouse.click(43, 8));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 2 / 250');
            expect(view.captureCharFrame()).toContain('Value  Renée Martin');
            await act(async () => view.mockMouse.scroll(45, 10, 'down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('varchar(120)');
            expect(view.captureCharFrame().split('\n')[7]).toContain('Luka Horvat');
            const header = view.captureCharFrame().split('\n')[5];
            await act(async () => view.mockMouse.scroll(45, 10, 'right'));
            await view.renderOnce();
            expect(view.captureCharFrame().split('\n')[5]).not.toBe(header);
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('explorer owns keyboard focus and opens an empty table', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            await act(async () => {
                view.mockInput.pressTab();
            });
            await act(async () => view.mockInput.pressArrow('down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 1 / 250');
            await act(async () => view.mockInput.pressArrow('down'));
            await act(async () => view.mockInput.pressEnter());
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('No rows. This table is empty.');
            expect(view.captureCharFrame()).toContain('No cell selected');
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('explorer clamps rapid navigation and opens the latest cursor before a render', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            await act(async () => view.mockInput.pressTab());
            await act(async () => {
                for (let index = 0; index < 10; index++) view.mockInput.pressArrow('down');
                view.mockInput.pressEnter();
            });
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('No rows. This table is empty.');

            await act(async () => view.mockInput.pressTab());
            await act(async () => {
                for (let index = 0; index < 10; index++) view.mockInput.pressArrow('up');
                view.mockInput.pressEnter();
            });
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('members   /   public');
            await act(async () => view.mockInput.pressArrow('down'));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 2 / 250');
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('mouse opening updates the explorer cursor used by Enter', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            await act(async () => view.mockMouse.click(10, 8));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('events   /   public');
            await act(async () => view.mockInput.pressTab());
            await act(async () => view.mockInput.pressEnter());
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('events   /   public');
        } finally {
            await act(async () => view.dispose());
        }
    });

    test('resizes and recovers from a terminal too small for the workspace', async () => {
        const view = await testRender(<App />, { width: 100, height: 24 });
        try {
            await view.renderOnce();
            await act(async () => view.resize(60, 16));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Row 1 / 250');
            await act(async () => view.resize(40, 10));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Resize terminal');
            await act(async () => view.resize(120, 35));
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Mara Novak');
        } finally {
            await act(async () => view.dispose());
        }
    });
});
