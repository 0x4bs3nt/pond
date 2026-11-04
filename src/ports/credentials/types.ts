// Passwords are handed off once, never persisted by the initial implementation.
export type Credentials = {
    setPassword: (profileId: string, password: string) => void;
    takePassword: (profileId: string) => Promise<string | undefined>;
    clear: () => void;
};
