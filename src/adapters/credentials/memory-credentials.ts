import type { Credentials } from '../../ports/credentials';

export const createMemoryCredentials = (): Credentials => {
    const passwords = new Map<string, string>();

    return {
        setPassword: (id, password) => {
            passwords.clear();
            passwords.set(id, password);
        },
        takePassword: async (id) => {
            const password = passwords.get(id);
            passwords.delete(id);

            return password;
        },
        clear: () => passwords.clear(),
    };
};
