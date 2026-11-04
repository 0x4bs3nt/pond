import { createDistribution } from './distribution';
import type { InteractionCategory, PendingInteraction } from './types';

export const createInteractionTracker = (now: () => number, frameId: () => number) => {
    const pending = new Map<number, PendingInteraction>();
    const groups = {
        navigation: { input: createDistribution(), action: createDistribution(), lastInBatch: createDistribution() },
        editing: { input: createDistribution(), action: createDistribution(), lastInBatch: createDistribution() },
    };

    let sequence = 0;
    let dropped = 0;
    let expired = 0;
    let abandoned = 0;
    let correlated = 0;
    let coalesced = 0;

    const expire = () => {
        for (const [id, item] of pending) {
            if (now() - item.startedAt >= 5000) {
                pending.delete(id);

                expired++;
            }
        }
    };

    return {
        begin: (category: InteractionCategory, inputAt?: number) => {
            expire();
            if (pending.size === 64) {
                pending.delete(pending.keys().next().value!);

                dropped++;
            }

            const id = ++sequence;
            pending.set(id, {
                category,
                startedAt: inputAt ?? now(),
                origin: inputAt === undefined ? 'action' : 'input',
            });

            return id;
        },
        acknowledge: (id: number) => {
            const item = pending.get(id);

            if (item) item.frameAfter = frameId();
        },
        abandon: (id: number) => {
            if (pending.delete(id)) abandoned++;
        },
        expire,
        frame: (completedFrame: number) => {
            expire();
            const completedAt = now();
            for (const category of ['navigation', 'editing'] as const) {
                for (const origin of ['input', 'action'] as const) {
                    const batch = [...pending].filter(
                        ([, item]) =>
                            item.category === category &&
                            item.origin === origin &&
                            item.frameAfter !== undefined &&
                            completedFrame > item.frameAfter
                    );

                    if (!batch.length) continue;
                    const timestamps = batch.map(([, item]) => item.startedAt);

                    groups[category][origin].add(completedAt - Math.min(...timestamps));
                    groups[category].lastInBatch.add(completedAt - Math.max(...timestamps));
                    correlated += batch.length;
                    coalesced += batch.length - 1;

                    for (const [id] of batch) pending.delete(id);
                }
            }
        },
        stop: () => {
            abandoned += pending.size;
            pending.clear();
        },
        snapshot: () => ({
            pending: pending.size,
            dropped,
            expired,
            abandoned,
            correlated,
            coalesced,
            navigation: {
                inputToFrameMs: groups.navigation.input.snapshot(),
                actionToFrameMs: groups.navigation.action.snapshot(),
                lastInBatchToFrameMs: groups.navigation.lastInBatch.snapshot(),
            },
            editing: {
                inputToFrameMs: groups.editing.input.snapshot(),
                actionToFrameMs: groups.editing.action.snapshot(),
                lastInBatchToFrameMs: groups.editing.lastInBatch.snapshot(),
            },
        }),
    };
};
