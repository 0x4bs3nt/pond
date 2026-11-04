import { useState } from 'react';
import type { AppProps } from './types';

import { WorkspaceProvider } from '../features/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { createWorkspaceStore } from '../state/workspace';
import { ErrorBoundary } from './ErrorBoundary';
import { Workspace } from './Workspace';
import { ConnectionManager } from '../features/connection-manager';

export const App = ({ tables, connectionDependencies, onError, logPath }: AppProps) => {
    const [store] = useState(() => createWorkspaceStore(tables[0]?.id ?? null));
    const [sessions] = useState(createTableSessionsStore);
    const [demo, setDemo] = useState(!connectionDependencies);

    return (
        <WorkspaceProvider store={store}>
            <ErrorBoundary onError={onError} logPath={logPath}>
                {!demo && connectionDependencies ? (
                    <ConnectionManager {...connectionDependencies} onDemo={() => setDemo(true)} />
                ) : (
                    <Workspace
                        tables={tables}
                        sessions={sessions}
                        onConnections={connectionDependencies ? () => setDemo(false) : undefined}
                    />
                )}
            </ErrorBoundary>
        </WorkspaceProvider>
    );
};
