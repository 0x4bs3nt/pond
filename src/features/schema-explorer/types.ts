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
import type { DatabaseSession } from '../../ports/database';
import type { TableSchema } from '../../domain/database';

export type DatabaseExplorerProps = {
    session: DatabaseSession;
    databaseName: string;
    onDisconnect: () => void;
    onError: (error: unknown) => void;
};
export type CatalogKeyboardOptions = {
    onRefresh: () => void;
    onDisconnect: () => void;
    onToggleFocus: () => void;
};
export type TableStructureProps = {
    schema: TableSchema;
    width: number;
    height: number;
    focused: boolean;
    onFocus: () => void;
};
