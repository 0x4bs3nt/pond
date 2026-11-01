export type SchemaExplorerProps = {
    tables: readonly { id: string; name: string }[];
    activeId: string;
    cursor: number;
    focused: boolean;
    width: number;
    height: number;
    onOpen: (index: number) => void;
};

export type WorkspaceTab = { id: string; label: string; dirty: boolean };
export type TabBarProps = {
    tabs: readonly WorkspaceTab[];
    activeId: string | null;
    focused: boolean;
    width: number;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
};
