import type { TableData } from '../../domain/database';
import type { GridColumn, GridRow } from '../../components/data-grid';
import type { TableSessionsStore } from '../../state/table-sessions';

export type TableViewRow = GridRow & { readOnlyColumns?: readonly string[] };

export type TableView = {
    id: string;
    name: string;
    namespace: string;
    columns: readonly GridColumn[];
    rows: readonly TableViewRow[];
};

export type TableBrowserProps = {
    table: TableView;
    sessions: TableSessionsStore;
    width: number;
    height: number;
    focused: boolean;
    onFocus: () => void;
};

export type TableBrowserKeyboardOptions = {
    isActive: () => boolean;
    focused: boolean;
    isEditing: () => boolean;
    onDiscard: () => void;
};

export type ReadOnlyTableProps = {
    data: TableData;
    width: number;
    height: number;
    focused: boolean;
    isActive: () => boolean;
    onFocus: () => void;
};
