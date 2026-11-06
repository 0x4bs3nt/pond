export type SchemaExplorerProps = {
    tables: readonly { id: string; name: string }[];
    width: number;
    height: number;
};

export type ExplorerKeyboardOptions = {
    focused: boolean;
    isActive?: () => boolean;
    moveCursor: (offset: number) => void;
    openSelected: () => void;
};
import type { DatabaseSession } from '../../ports/database';
import type { TableSchema } from '../../domain/database';

export type DatabaseExplorerProps = {
    session: DatabaseSession;
    databaseName: string;
    isActive?: () => boolean;
    onConnections?: () => void;
    onDisconnect: () => void;
    onError: (error: unknown) => void;
};
export type CatalogKeyboardOptions = {
    onToggleStructure: () => void;
    isActive?: () => boolean;
    onConnections?: () => void;
    onRefresh: () => void;
    onDisconnect: () => void;
    onToggleFocus: () => void;
};
export type TableStructureProps = {
    isActive?: () => boolean;
    schema: TableSchema;
    width: number;
    height: number;
    focused: boolean;
    onFocus: () => void;
};
