import type { CellPosition, GridColumn, GridRow } from '../../src/components/data-grid';
import type { theme } from '../../src/theme';
import type { ExplorerGroup } from '../../src/components/navigation';

export type GalleryScenario = {
    id: string;
    label: string;
    description: string;
    columns: readonly GridColumn[];
    rows: readonly GridRow[];
    editor?: { multiline: boolean; json: boolean };
    explorer?: { groups: readonly ExplorerGroup[]; message?: string };
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
export type ExplorerScenarioProps = {
    groups: readonly ExplorerGroup[];
    message?: string;
    width: number;
    height: number;
};
export type ExplorerScenarioKeyboardOptions = {
    onMove: (offset: number) => void;
    onOpen: () => void;
    onToggleFocus: () => void;
    focused: boolean;
};
export type GalleryPalette = typeof theme;
export type GalleryOptions = { scenario: string; theme: string; list?: boolean };
export type BenchmarkOptions = { rows: number; columns: number; steps: number; rounds: number; valueLength: number };
