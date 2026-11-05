import { theme } from '../../theme';
import { usePasswordKeyboard } from './use-password-keyboard';
import type { PasswordPromptProps } from './types';

export const PasswordPrompt = (props: PasswordPromptProps) => {
    const { length, submit, cancel } = usePasswordKeyboard(props);

    return (
        <box flexDirection="column" border borderColor={theme.accent} paddingLeft={1} height={5}>
            <text fg={theme.text}>Password: {'*'.repeat(Math.min(length, 40))}</text>
            <box height={1} flexDirection="row">
                <text fg={theme.accent} onMouseDown={submit}>
                    Enter Connect{' '}
                </text>
                <text fg={theme.accent} onMouseDown={cancel}>
                    · Esc Cancel{' '}
                </text>
                <text fg={theme.muted}>· Ctrl+U clear</text>
            </box>
            <text fg={theme.muted}>Used for this connection only; never saved.</text>
        </box>
    );
};
