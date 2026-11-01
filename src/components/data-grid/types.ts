export type GridColumn = {
    id: string;
    name: string;
    type: string;
    width: number;
};

// Values are display-ready strings. NULL stays distinct from empty text.
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
