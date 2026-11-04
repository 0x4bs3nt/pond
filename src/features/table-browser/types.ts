import type { GridColumn, GridRow } from '../../components/data-grid';
import type { TableSessionsStore } from '../../state/table-sessions';

export type TableView = {
    id: string;
    name: string;
    namespace: string;
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
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
    focused: boolean;
    isEditing: () => boolean;
    onDiscard: () => void;
};
