import { useState } from 'react';
import type { AppProps } from './types';

import { WorkspaceProvider } from '../features/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { createWorkspaceStore } from '../state/workspace';
import { ErrorBoundary } from './ErrorBoundary';
import { Workspace } from './Workspace';

export const App = ({ tables, onError, logPath }: AppProps) => {
    const [store] = useState(() => createWorkspaceStore(tables[0]?.id ?? null));
    const [sessions] = useState(createTableSessionsStore);

    return (
        <WorkspaceProvider store={store}>
            <ErrorBoundary onError={onError} logPath={logPath}>
                <Workspace tables={tables} sessions={sessions} />
            </ErrorBoundary>
        </WorkspaceProvider>
    );
};
