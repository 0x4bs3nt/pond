import { useRef, useState } from 'react';
import type { AppProps } from './types';

import { WorkspaceProvider } from '../features/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { createWorkspaceStore } from '../state/workspace';
import { ErrorBoundary } from './ErrorBoundary';
import { Workspace } from './Workspace';
import { ConnectionManager } from '../features/connection-manager';

export const App = ({ tables, connectionDependencies, onError, logPath }: AppProps) => {
    const demoRef = useRef(!connectionDependencies);

    const [store] = useState(() => createWorkspaceStore(tables[0]?.id ?? null, () => demoRef.current));
    const [sessions] = useState(createTableSessionsStore);
    const [demo, setDemo] = useState(!connectionDependencies);
    const [demoOpened, setDemoOpened] = useState(!connectionDependencies);

    const openDemo = () => {
        demoRef.current = true;
        setDemoOpened(true);
        setDemo(true);
    };

    const openConnections = () => {
        demoRef.current = false;
        setDemo(false);
    };

    return (
        <WorkspaceProvider store={store}>
            <ErrorBoundary onError={onError} logPath={logPath}>
                {connectionDependencies && (
                    <box visible={!demo}>
                        <ConnectionManager
                            {...connectionDependencies}
                            onDemo={openDemo}
                            isActive={() => !demoRef.current}
                        />
                    </box>
                )}
                {demoOpened && (
                    <box visible={demo}>
                        <Workspace
                            tables={tables}
                            sessions={sessions}
                            onConnections={connectionDependencies ? openConnections : undefined}
                        />
                    </box>
                )}
            </ErrorBoundary>
        </WorkspaceProvider>
    );
};
