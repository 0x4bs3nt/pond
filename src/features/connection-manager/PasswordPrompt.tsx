import { theme } from '../../theme';
import { usePasswordKeyboard } from './use-password-keyboard';
import type { PasswordPromptProps } from './types';

export const PasswordPrompt = (props: PasswordPromptProps) => {
    const length = usePasswordKeyboard(props);

    return (
        <box flexDirection="column" border borderColor={theme.accent} paddingLeft={1} height={5}>
            <text fg={theme.text}>Password: {'*'.repeat(Math.min(length, 40))}</text>
            <text fg={theme.muted}>Enter connect · Esc cancel · Ctrl+U clear</text>
            <text fg={theme.muted}>Used for this connection only; never saved.</text>
        </box>
    );
};
