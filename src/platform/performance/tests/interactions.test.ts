import { expect, test } from 'bun:test';
import { createInteractionTracker } from '../interactions';

test('only acknowledged actions match later frames and batches retain first/last latency', () => {
    let now = 10;
    let frame = 4;
    const tracker = createInteractionTracker(
        () => now,
        () => frame
    );
    const first = tracker.begin('navigation', 0);
    tracker.frame(5); // Unrelated frame before commit cannot match.
    expect(tracker.snapshot().correlated).toBe(0);
    frame = 5;
    tracker.acknowledge(first);
    const second = tracker.begin('navigation', 8);
    tracker.acknowledge(second);
    tracker.frame(5); // Presentation of an already in-flight frame is excluded.
    expect(tracker.snapshot().correlated).toBe(0);
    now = 20;
    tracker.frame(6);
    const result = tracker.snapshot();
    expect(result.correlated).toBe(2);
    expect(result.coalesced).toBe(1);
    expect(result.navigation.inputToFrameMs.mean).toBe(20);
    expect(result.navigation.lastInBatchToFrameMs.mean).toBe(12);
    tracker.frame(7);
    expect(tracker.snapshot().navigation.inputToFrameMs.count).toBe(1);
});

test('pending actions expire, overflow stays bounded, and non-keyboard actions use separate metrics', () => {
    let now = 0;
    const tracker = createInteractionTracker(
        () => now,
        () => 0
    );
    for (let index = 0; index < 70; index++) tracker.begin('editing');
    expect(tracker.snapshot().pending).toBe(64);
    expect(tracker.snapshot().dropped).toBe(6);
    now = 5000;
    tracker.expire();
    expect(tracker.snapshot().expired).toBe(64);
    const id = tracker.begin('editing');
    tracker.acknowledge(id);
    now += 10;
    tracker.frame(1);
    expect(tracker.snapshot().editing.actionToFrameMs.mean).toBe(10);
    expect(tracker.snapshot().editing.inputToFrameMs.count).toBe(0);
    tracker.begin('navigation');
    tracker.stop();
    tracker.stop();
    expect(tracker.snapshot().abandoned).toBe(1);
    expect(tracker.snapshot().pending).toBe(0);
});
