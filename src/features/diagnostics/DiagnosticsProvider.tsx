import { createContext, Profiler, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import type { DiagnosticsSession, InteractionCategory } from '../../platform/performance';
import type { DiagnosticBoundaryProps, DiagnosticsProviderProps } from './types';

const DiagnosticsContext = createContext<DiagnosticsSession | undefined>(undefined);
export const DiagnosticsProvider = ({ session, children }: DiagnosticsProviderProps) => (
    <DiagnosticsContext.Provider value={session}>{children}</DiagnosticsContext.Provider>
);

export const DiagnosticBoundary = ({ id, children }: DiagnosticBoundaryProps) => {
    const session = useContext(DiagnosticsContext);

    return session ? (
        <Profiler id={id} onRender={(_id, _phase, actual, base) => session.profile(id, actual, base)}>
            {children}
        </Profiler>
    ) : (
        children
    );
};

export const useDiagnosticsReady = (usable: boolean) => {
    const session = useContext(DiagnosticsContext);

    useLayoutEffect(() => {
        session?.ready(usable);
    }, [session, usable]);
};

export const useDiagnosticActions = () => {
    const session = useContext(DiagnosticsContext);
    const pending = useRef<number[]>([]);

    // Called by components whose measured callbacks actually change their local state.
    useLayoutEffect(() => {
        for (const id of pending.current.splice(0)) session?.acknowledge(id);
    });

    useEffect(
        () => () => {
            for (const id of pending.current.splice(0)) session?.abandon(id);
        },
        [session]
    );

    return {
        mark: (category: InteractionCategory) => {
            const id = session?.begin(category);

            if (id === undefined) return;
            if (pending.current.length === 64) session?.abandon(pending.current.shift()!);

            pending.current.push(id);
        },
        nativeEdit: session?.nativeEdit,
    };
};
