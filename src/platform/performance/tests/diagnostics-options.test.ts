import { expect, test } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import { diagnosticsRendererOptions } from '../index';

test('frame history is collected only with an explicit diagnostics opt-in', async () => {
    for (const optIn of [undefined, '', '0', 'false', 'true', ' 1 ', '1']) {
        const view = await createTestRenderer({
            width: 20,
            height: 5,
            ...diagnosticsRendererOptions(optIn),
        });
        try {
            await view.renderOnce();
            expect(view.getNativeStats().nativeFrameCount).toBeGreaterThan(0);
            expect(view.renderer.getStats().frameTimes.length > 0).toBe(optIn === '1');
        } finally {
            await view.dispose();
        }
    }
});
