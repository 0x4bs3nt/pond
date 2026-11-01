import type { CellPosition, GridColumn, GridRow } from '../../src/components/data-grid';
import type { theme } from '../../src/theme';

export type GalleryScenario = {
    id: string;
    label: string;
    description: string;
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
    editor?: { multiline: boolean; json: boolean };
};
export type GalleryProps = { initialScenario: string; palette: string };
export type ScenarioProps = {
    scenario: GalleryScenario;
    width: number;
    height: number;
    isActive: () => boolean;
    onEditing: (value: boolean) => void;
};
export type GalleryKeyboardOptions = {
    isEditing: () => boolean;
    onPrevious: () => void;
    onNext: () => void;
    onReset: () => void;
};
export type ScenarioKeyboardOptions = {
    isEditing: () => boolean;
    onOpen: (position: CellPosition) => void;
    getSelection: () => CellPosition;
    onDiscard: () => void;
    editorOnly: boolean;
};
export type GalleryPalette = typeof theme;
export type GalleryOptions = { scenario: string; theme: string; list?: boolean };
