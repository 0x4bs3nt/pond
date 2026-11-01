export type SchemaExplorerProps = {
    tables: readonly { id: string; name: string }[];
    width: number;
    height: number;
};

export type ExplorerKeyboardOptions = {
    focused: boolean;
    moveCursor: (offset: number) => void;
    openSelected: () => void;
};
