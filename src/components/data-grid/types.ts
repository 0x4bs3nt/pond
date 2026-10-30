export type GridColumn = {
    id: string;
    name: string;
    type: string;
    width: number;
};

// Values are display-ready strings. NULL stays distinct from empty text.
export type GridRow = { id: string; cells: readonly (string | null)[] };
export type CellPosition = { row: number; column: number };
export type GridViewport = { top: number; left: number };

export type DataGridProps = {
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
    width: number;
    height: number;
    focused: boolean;
    selection: CellPosition;
    onSelect: (position: CellPosition) => void;
    onFocus: () => void;
};
