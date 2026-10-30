import type { GridColumn, GridRow } from '../../components/data-grid';

// Presentation contract shared by mock fixtures and future domain presenters.
export type TableView = {
    id: string;
    name: string;
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
};
