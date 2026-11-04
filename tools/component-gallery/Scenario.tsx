import { useRef, useState } from 'react';
import { DataGrid, type CellPosition, type GridRow } from '../../src/components/data-grid';
import { CellEditor } from '../../src/components/editors';
import { theme } from '../../src/theme';
import type { ScenarioProps } from './types';
import { useScenarioKeyboard } from './use-gallery-keyboard';
import { useDiagnosticActions } from '../../src/features/diagnostics';

export const Scenario = ({ scenario, width, height, isActive, onEditing }: ScenarioProps) => {
    const diagnostics = useDiagnosticActions();
    const [selection, setSelection] = useState<CellPosition>({ row: 0, column: 0 });
    const latestSelection = useRef(selection);
    latestSelection.current = selection;
    const [rows, setRows] = useState<readonly GridRow[]>(scenario.rows);
    const [editor, setEditor] = useState<CellPosition | null>(null);

    const editing = useRef(false);
    const isEditing = () => editing.current;

    const open = (position: CellPosition) => {
        if (!isActive() || editing.current || !rows[position.row] || !scenario.columns[position.column]) return;
        diagnostics.mark('editing');

        editing.current = true;
        onEditing(true);
        setEditor(position);
    };

    const cancel = () => {
        if (editing.current) diagnostics.mark('editing');
        editing.current = false;
        onEditing(false);
        setEditor(null);
    };

    const confirm = (value: string | null) => {
        if (!editor) return;

        const column = scenario.columns[editor.column]!;
        setRows((current) =>
            current.map((row, index) =>
                index !== editor.row
                    ? row
                    : {
                          ...row,
                          cells: row.cells.map((cell, cellIndex) => (cellIndex === editor.column ? value : cell)),
                          modifiedColumns: [...new Set([...(row.modifiedColumns ?? []), column.id])],
                      }
            )
        );
        cancel();
    };

    useScenarioKeyboard({
        isEditing,
        onOpen: open,
        getSelection: () => selection,
        onDiscard: () => {
            if (isActive()) setRows(scenario.rows);
        },
        editorOnly: Boolean(scenario.editor),
    });

    const selected = rows[selection.row]?.cells[selection.column];
    const editorValue = editor ? (rows[editor.row]?.cells[editor.column] ?? null) : null;

    return (
        <box width={width} height={height} flexDirection="column" backgroundColor={theme.background}>
            {scenario.editor ? (
                <box height={height - 3} flexDirection="column" padding={1}>
                    <text
                        height={1}
                        fg={theme.accent}
                        selectable={false}
                        onMouseDown={(event) => {
                            if (event.button === 0) open(selection);
                        }}
                    >
                        [ Open editor ]
                    </text>
                    <text fg={theme.text} wrapMode="char">
                        {selected === null ? 'NULL' : selected === '' ? "'' (empty text)" : selected}
                    </text>
                </box>
            ) : (
                <DataGrid
                    columns={scenario.columns}
                    rows={rows}
                    width={width}
                    height={height - 3}
                    selection={selection}
                    onSelect={(position) => {
                        if (
                            position.row !== latestSelection.current.row ||
                            position.column !== latestSelection.current.column
                        ) {
                            diagnostics.mark('navigation');
                            latestSelection.current = position;
                            setSelection(position);
                        }
                    }}
                    getInteraction={() => (!isActive() || isEditing() ? 'disabled' : 'focused')}
                    onFocus={() => {}}
                    onEdit={open}
                />
            )}
            <text height={1} flexShrink={0} fg={theme.accent} wrapMode="none">
                {rows.length
                    ? ` Row ${selection.row + 1}/${rows.length} · ${scenario.columns[selection.column]?.name}`
                    : ' No rows'}
            </text>
            <text height={2} flexShrink={0} fg={theme.text} wrapMode="char">
                {selected === null ? ' NULL' : selected === '' ? " '' (empty text)" : ` ${selected ?? ''}`}
            </text>
            {editor && (
                <CellEditor
                    onContentEdited={diagnostics.nativeEdit}
                    label={scenario.columns[editor.column]!.name}
                    value={editorValue}
                    multiline={scenario.editor?.multiline ?? true}
                    json={scenario.editor?.json ?? false}
                    width={width}
                    height={height - 3}
                    onConfirm={confirm}
                    onCancel={cancel}
                />
            )}
        </box>
    );
};
