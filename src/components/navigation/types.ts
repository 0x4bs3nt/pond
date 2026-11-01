export type SchemaExplorerProps = {
    tables: readonly { id: string; name: string }[];
    activeId: string;
    cursor: number;
    focused: boolean;
    width: number;
    height: number;
    onOpen: (index: number) => void;
};
