export type ProbeFrame = {
    frameId: number;
    revision: number;
    samplesDuringEvent: number;
    samplesAfterEvent?: number;
};

export type ProbeCommit = {
    phase: string;
    actualDurationMs: number;
    baseDurationMs: number;
};
