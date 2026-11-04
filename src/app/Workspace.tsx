import { useTerminalDimensions } from '@opentui/react';
import { useCallback } from 'react';
import type { WorkspaceProps } from './types';

import { SchemaExplorer } from '../features/schema-explorer';
import { TableBrowser } from '../features/table-browser';
import { WorkspaceStatusBar, WorkspaceTabs, useWorkspace, useWorkspaceKeyboard } from '../features/workspace';
import { theme } from '../theme';
import { DiagnosticBoundary, useDiagnosticsReady } from '../features/diagnostics';

export const Workspace = ({ tables, sessions }: WorkspaceProps) => {
    const { width, height } = useTerminalDimensions();

    const activeTableId = useWorkspace((state) => state.activeTableId);
    const focus = useWorkspace((state) => state.focus);
    const focusPanel = useWorkspace((state) => state.focusPanel);

    const focusGrid = useCallback(() => focusPanel('grid'), [focusPanel]);

    const sidebarWidth = width >= 90 ? 24 : 20;
    const table = tables.find((candidate) => candidate.id === activeTableId);

    useWorkspaceKeyboard();
    useDiagnosticsReady(width >= 60 && height >= 16);

    if (width < 60 || height < 16)
        return <text fg={theme.accent}>Pond · Resize terminal to at least 60 × 16. Press q to quit.</text>;

    return (
        <box width={width} height={height} flexDirection="column" backgroundColor={theme.background}>
            <box height={2} flexShrink={0} paddingLeft={1} backgroundColor={theme.panel}>
                <text fg={theme.accent}>POND / Database workspace</text>
                <text fg={theme.muted}>Explore your data · Mock connection</text>
            </box>
            <box height={height - 3} flexDirection="row">
                <DiagnosticBoundary id="explorer">
                    <SchemaExplorer tables={tables} width={sidebarWidth} height={height - 3} />
                </DiagnosticBoundary>
                <box width={width - sidebarWidth} height={height - 3} flexDirection="column">
                    <DiagnosticBoundary id="tabs">
                        <WorkspaceTabs tables={tables} sessions={sessions} width={width - sidebarWidth} />
                    </DiagnosticBoundary>
                    {table ? (
                        <DiagnosticBoundary id="table-browser">
                            <TableBrowser
                                key={table.id}
                                table={table}
                                sessions={sessions}
                                width={width - sidebarWidth}
                                height={height - 5}
                                focused={focus === 'grid'}
                                onFocus={focusGrid}
                            />
                        </DiagnosticBoundary>
                    ) : (
                        <text fg={theme.muted}>Open a table from the explorer.</text>
                    )}
                </box>
            </box>
            <WorkspaceStatusBar />
        </box>
    );
};
