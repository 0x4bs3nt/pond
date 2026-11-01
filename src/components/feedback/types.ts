export type KeyboardHint = { keys: string; action: string };

export type KeyboardHintsProps = {
    label?: string;
    hints: readonly KeyboardHint[];
};
