import { theme } from '../../theme';

export type KeyboardHint = { keys: string; action: string };

type KeyboardHintsProps = {
    label?: string;
    hints: readonly KeyboardHint[];
};

export const KeyboardHints = ({ label, hints }: KeyboardHintsProps) => (
    <text height={1} flexShrink={0} bg={theme.raised} fg={theme.muted} wrapMode="none">
        {' ' + [label, ...hints.map(({ keys, action }) => `${keys} ${action}`)].filter(Boolean).join(' · ')}
    </text>
);
