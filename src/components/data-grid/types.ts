import type { layoutColumns } from './layout';

export type GridColumn = {
    id: string;
    name: string;
    type: string;
    width: number;
};

export type GridRow = { id: string; cells: readonly (string | null)[]; modifiedColumns?: readonly string[] };

export type CellPosition = { row: number; column: number };

export type GridViewport = { top: number; left: number };

export type GridInteraction = 'focused' | 'unfocused' | 'disabled';

export type DataGridProps = {
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
    width: number;
    height: number;
    // Read at render time and for each event so ownership can change before React rerenders.
    // Unfocused grids accept mouse interaction; disabled grids accept no input.
    getInteraction: () => GridInteraction;
    selection: CellPosition;
    onSelect: (position: CellPosition) => void;
    onFocus: () => void;
    onEdit?: (position: CellPosition) => void;
};

export type GridBodyProps = {
    columns: readonly PositionedColumn[];
    rows: readonly GridRow[];
    top: number;
    left: number;
    width: number;
    height: number;
    gutter: number;
    selection: CellPosition;
    focused: boolean;
    onSelect: (position: CellPosition) => void;
};

export type GridCellProps = {
    value: string | null | undefined;
    left: number;
    width: number;
    selected: boolean;
    focused: boolean;
    modified?: boolean;
    onSelect: () => void;
};

export type GridHeaderProps = {
    columns: readonly PositionedColumn[];
    left: number;
    width: number;
    gutter: number;
    focused: boolean;
};

export type GridKeyboardOptions = {
    getInteraction: () => GridInteraction;
    getSelection: () => CellPosition;
    rowCount: number;
    columnCount: number;
    pageSize: number;
    onSelect: (position: CellPosition) => void;
    onEdit?: (position: CellPosition) => void;
};

export type PositionedColumn = ReturnType<typeof layoutColumns>[number];
