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
export type ConnectionManagerProps = ConnectionDependencies & { onDemo: () => void };
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
export type ConnectionKeyboardOptions = {
    enabled: boolean;
    prompting: boolean;
    field: number;
    setField: (update: (value: number) => number) => void;
    onTLS: (reverse: boolean) => void;
    onSave: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onNew: () => void;
    onNext: (reverse: boolean) => void;
    onDemo: () => void;
};
