import type { ReactNode } from 'react';
import type { DiagnosticsSession, ProfileRegion } from '../../platform/performance';

export type DiagnosticsProviderProps = { session?: DiagnosticsSession; children: ReactNode };
export type DiagnosticBoundaryProps = { id: ProfileRegion; children: ReactNode };
