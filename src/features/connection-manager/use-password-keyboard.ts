import { useKeyboard, usePaste } from '@opentui/react';
import { useEffect, useRef, useState } from 'react';
import type { PasswordPromptProps } from './types';

export const usePasswordKeyboard = ({ onSubmit, onCancel }: PasswordPromptProps) => {
    const password = useRef('');
    const finished = useRef(false);
    const [length, setLength] = useState(0);

    useEffect(
        () => () => {
            password.current = '';
        },
        []
    );

    const append = (text: string) => {
        password.current = (password.current + text.replace(/[\x00-\x1f\x7f]/gu, '')).slice(0, 4096);

        setLength(Array.from(password.current).length);
    };

    const finish = (submit: boolean) => {
        if (finished.current) return;
        finished.current = true;
        const value = password.current;
        password.current = '';
        if (submit) onSubmit(value);
        else onCancel();
    };

    usePaste((event) => {
        event.preventDefault();
        if (!finished.current) append(new TextDecoder().decode(event.bytes));
    });

    useKeyboard((key) => {
        if (key.ctrl && key.name === 'c') return;
        key.preventDefault();

        if (finished.current) return;
        if (key.name === 'escape' || key.name === 'return') {
            finish(key.name === 'return');
        } else if (key.ctrl && key.name === 'u') {
            password.current = '';
            setLength(0);
        } else if (key.name === 'backspace') {
            password.current = Array.from(password.current).slice(0, -1).join('');
            setLength(Array.from(password.current).length);
        } else if (!key.ctrl && !key.meta && !key.sequence.includes('\x1b')) append(key.sequence);
    });
    return { length, submit: () => finish(true), cancel: () => finish(false) };
};
