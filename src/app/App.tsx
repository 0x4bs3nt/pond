import { useState } from 'react';
import type { AppProps } from './types';

import { mockTables } from '../features/table-browser';
import { WorkspaceProvider } from '../features/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { createWorkspaceStore } from '../state/workspace';
import { ErrorBoundary } from './ErrorBoundary';
import { Workspace } from './Workspace';

export const App = ({ onError, logPath }: AppProps) => {
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
