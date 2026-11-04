import { useTerminalDimensions } from '@opentui/react';
import { useRef, useState } from 'react';
import { theme } from '../../src/theme';
import { scenarios } from './scenarios';
import { Scenario } from './Scenario';
import { useGalleryKeyboard } from './use-gallery-keyboard';
import { useDiagnosticsReady } from '../../src/features/diagnostics';
import type { GalleryProps } from './types';

export const Gallery = ({ initialScenario, palette }: GalleryProps) => {
    const { width, height } = useTerminalDimensions();
    const [index, setIndex] = useState(() =>
        Math.max(
            0,
            scenarios.findIndex((item) => item.id === initialScenario)
        )
    );
    const [revision, setRevision] = useState(0);
    const currentRevision = useRef(0);
    const editing = useRef(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const scenario = scenarios[index]!;

    const reset = () => {
        if (editing.current) return;
        // Revoke the outgoing instance before React commits the replacement.
        currentRevision.current += 1;
        setRevision(currentRevision.current);
    };
    const change = (offset: number) => {
        if (editing.current) return;
        reset();
        setIndex((current) => (current + offset + scenarios.length) % scenarios.length);
    };

    useGalleryKeyboard({
        isEditing: () => editing.current,
        onPrevious: () => change(-1),
        onNext: () => change(1),
        onReset: reset,
    });

    // Keep the scenario mounted below the minimum size so an editor draft survives resizing.
    const small = width < 60 || height < 18;
    useDiagnosticsReady(!small);
    return (
        <box width={width} height={height} flexDirection="column" backgroundColor={theme.background} overflow="hidden">
            <text
                height={1}
                flexShrink={0}
                fg={theme.accent}
                wrapMode="none"
            >{` POND GALLERY · ${index + 1}/${scenarios.length} ${scenario.label} · ${palette}`}</text>
            <box height={1} flexShrink={0} flexDirection="row" backgroundColor={theme.raised}>
                <text
                    width={18}
                    fg={theme.accent}
                    selectable={false}
                    onMouseDown={(event) => {
                        if (event.button === 0) change(-1);
                    }}
                >
                    {' '}
                    [F5 Previous]
                </text>
                <text
                    width={14}
                    fg={theme.accent}
                    selectable={false}
                    onMouseDown={(event) => {
                        if (event.button === 0) change(1);
                    }}
                >
                    [F6 Next]
                </text>
                <text
                    width={12}
                    fg={theme.accent}
                    selectable={false}
                    onMouseDown={(event) => {
                        if (event.button === 0) reset();
                    }}
                >
                    [r Reset]
                </text>
            </box>
            <text height={2} flexShrink={0} fg={small ? theme.modified : theme.muted} wrapMode="word">
                {small
                    ? ' Resize to at least 60 × 18. An open draft is preserved; Esc cancels.'
                    : ` ${scenario.description}`}
            </text>
            <Scenario
                key={`${scenario.id}:${revision}`}
                scenario={scenario}
                width={Math.max(60, width)}
                height={Math.max(13, height - 5)}
                isActive={() => revision === currentRevision.current}
                onEditing={(value) => {
                    if (revision !== currentRevision.current) return;
                    editing.current = value;
                    setEditorOpen(value);
                }}
            />
            <text height={1} flexShrink={0} fg={theme.muted} wrapMode="none">
                {editorOpen
                    ? ' Editing · Esc cancel · Ctrl+S stage · Ctrl+N NULL'
                    : ' Enter edit · Ctrl+D reset values · F5/F6 scenarios · r reset · q quit'}
            </text>
        </box>
    );
};
