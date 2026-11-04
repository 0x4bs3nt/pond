import type { DatabaseConnection, DatabaseNetwork } from '../database';

export type ConnectionProfile = {
    readonly id: string;
    readonly name: string;
    readonly connection: DatabaseConnection & { readonly engineId: 'postgres'; readonly network: DatabaseNetwork };
};
