import { useState } from 'react';

import { mockTables } from '../features/table-browser';
import { WorkspaceProvider } from '../features/workspace';
import { createWorkspaceStore } from '../state/workspace';
import { createTableSessionsStore } from '../state/table-sessions';
import { Workspace } from './Workspace';

export const App = () => {
    const [store] = useState(() => createWorkspaceStore(mockTables[0]?.id ?? null));
    const [sessions] = useState(createTableSessionsStore);

    return (
        <WorkspaceProvider store={store}>
            <Workspace sessions={sessions} />
        </WorkspaceProvider>
    );
};
