import { useRef, useState } from 'react';
import type { InputRenderable, TextareaRenderable } from '@opentui/core';

import { theme } from '../../theme';
import { useCellEditorKeyboard } from './use-cell-editor-keyboard';

type CellEditorProps = {
    label: string;
    value: string | null;
    multiline: boolean;
    json: boolean;
    width: number;
    height: number;
    onConfirm: (value: string | null) => void;
    onCancel: () => void;
};

export const CellEditor = ({ label, value, multiline, json, width, height, onConfirm, onCancel }: CellEditorProps) => {
    const input = useRef<InputRenderable>(null);
    const textarea = useRef<TextareaRenderable>(null);
    const changed = useRef(false);
    const lastText = useRef(value ?? '');

    const [error, setError] = useState('');

    const trackChange = () => {
        const text = (multiline ? textarea.current?.plainText : input.current?.value) ?? '';
        if (text !== lastText.current) changed.current = true;
        lastText.current = text;
    };

    const confirm = () => {
        const text = (multiline ? textarea.current?.plainText : input.current?.value) ?? '';

        // Opening and confirming NULL without typing must not turn it into empty text.
        const next = value === null && !changed.current && text === '' ? null : text;
        if (json && next !== null) {
            try {
                JSON.parse(next);
            } catch {
                setError('Invalid JSON. Fix it or press Esc to cancel.');

                return;
            }
        }

        // Validate JSON without serializing it: preserve whitespace and exact numeric literals.
        onConfirm(next);
    };

    useCellEditorKeyboard({
        multiline,
        onCancel,
        onConfirm: confirm,
        onSetNull: () => onConfirm(null),
        onEdit: () => {
            changed.current = true;
        },
    });

    return (
        <box
            position="absolute"
            left={0}
            top={3}
            width={width}
            height={height}
            backgroundColor={theme.panel}
            border
            borderColor={theme.accent}
            flexDirection="column"
            paddingLeft={1}
            paddingRight={1}
        >
            <text
                height={1}
                fg={theme.accent}
            >{`Edit ${label}${json ? ' (JSON)' : multiline ? ' (multiline)' : ''}`}</text>
            <text height={1} fg={theme.muted}>
                {multiline ? 'Ctrl+S stage · Enter newline · Esc cancel' : 'Enter stage · Esc cancel'}
            </text>
            <text height={1} fg={theme.muted}>
                Ctrl+N stage NULL · Changes stay local
            </text>
            {multiline ? (
                <textarea
                    ref={textarea}
                    initialValue={value ?? ''}
                    focused
                    height={Math.max(1, height - 6)}
                    onContentChange={trackChange}
                    onPaste={() => {
                        changed.current = true;
                    }}
                    textColor={theme.text}
                    backgroundColor={theme.background}
                />
            ) : (
                <input
                    ref={input}
                    value={value ?? ''}
                    focused
                    onInput={trackChange}
                    onPaste={() => {
                        changed.current = true;
                    }}
                    onSubmit={confirm}
                    textColor={theme.text}
                    backgroundColor={theme.background}
                />
            )}
            <text height={1} fg={theme.modified}>
                {error || (value === null ? 'Current value: NULL' : '')}
            </text>
        </box>
    );
};
