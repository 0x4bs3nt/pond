export type CellEditorKeyboardOptions = {
    multiline: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    onSetNull: () => void;
    onEdit: () => void;
};

export type CellEditorProps = {
    label: string;
    value: string | null;
    multiline: boolean;
    json: boolean;
    width: number;
    height: number;
    onConfirm: (value: string | null) => void;
    onCancel: () => void;
};
