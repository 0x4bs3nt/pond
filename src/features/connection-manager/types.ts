import type { ConnectionProfile } from '../../domain/connections';
import type { Credentials } from '../../ports/credentials';
import type { ProfileRepository } from '../../ports/profiles';
import type { ConnectionService } from '../../services/connections';

export type ConnectionDependencies = {
    profiles: ProfileRepository;
    credentials: Credentials;
    connections: ConnectionService;
    onError: (error: unknown) => void;
};
export type ConnectionManagerProps = ConnectionDependencies & { onDemo: () => void; isActive?: () => boolean };
export type ProfileDraft = {
    id: string;
    name: string;
    host: string;
    port: string;
    database: string;
    user: string;
    tls: ConnectionProfile['connection']['network']['tls'];
};
export type PasswordPromptProps = { onSubmit: (password: string) => void; onCancel: () => void };
export type ManagerView =
    | { kind: 'list' }
    | { kind: 'workspace' }
    | { kind: 'form'; visitId: string; profile?: ConnectionProfile }
    | { kind: 'password'; profile: ConnectionProfile }
    | { kind: 'delete'; profile: ConnectionProfile };
export type ProfileErrors = Partial<Record<'name' | 'host' | 'port' | 'database' | 'user', string>>;
export type ProfileFormProps = {
    profile?: ConnectionProfile;
    enabled: boolean;
    isActive: () => boolean;
    onSave: (profile: ConnectionProfile) => void;
    onCancel: () => void;
};
export type ProfileKeyboardOptions = {
    isActive: () => boolean;
    field: number;
    setField: (update: (value: number) => number) => void;
    onTLS: (reverse: boolean) => void;
    onSave: () => void;
    onCancel: () => void;
};
export type ConnectionKeyboardOptions = {
    getMode: () => ManagerView['kind'] | null;
    onMove: (offset: number) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onNew: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onConfirmDelete: () => void;
    onCancel: () => void;
    onReload: () => void;
    onWorkspace: () => void;
    onDemo: () => void;
};
