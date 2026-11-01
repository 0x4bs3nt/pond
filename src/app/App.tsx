import { useState } from 'react';

import { mockTables } from '../features/table-browser';
import { WorkspaceProvider } from '../features/workspace';
import { createWorkspaceStore } from '../state/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { Workspace } from './Workspace';
import { ErrorBoundary } from './ErrorBoundary';

export const App = ({ onError, logPath }: { onError?: (error: unknown) => void; logPath?: string }) => {
    const [store] = useState(() => createWorkspaceStore(mockTables[0]?.id ?? null));
    const [sessions] = useState(createTableSessionsStore);

    return (
        <WorkspaceProvider store={store}>
            <ErrorBoundary onError={onError} logPath={logPath}>
                <Workspace sessions={sessions} />
            </ErrorBoundary>
        </WorkspaceProvider>
    );
};
