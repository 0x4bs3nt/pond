export type ExplorerTable = { id: string; name: string; kind?: string };
export type ExplorerGroup = { id: string; name: string; tables: readonly ExplorerTable[] };
export type ExplorerEntry = { id: string; label: string } | { id: string; table: ExplorerTable; index: number };

export type SchemaExplorerProps = {
    groups: readonly ExplorerGroup[];
    databaseName?: string;
    message?: string;
    footer?: string;
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
