import type { ConnectionProfile } from './types';

const isText = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= 255 && !/[\x00-\x1f\x7f]/u.test(value);

export const isConnectionProfile = (value: unknown): value is ConnectionProfile => {
    if (!value || typeof value !== 'object') return false;

    const profile = value as ConnectionProfile;
    const connection = profile.connection;
    const network = connection?.network;

    return (
        isText(profile.id) &&
        isText(profile.name) &&
        connection?.engineId === 'postgres' &&
        isText(connection.database) &&
        !!network &&
        isText(network.host) &&
        !/[\s/@?#]/u.test(network.host) &&
        isText(network.user) &&
        Number.isInteger(network.port) &&
        network.port > 0 &&
        network.port <= 65535 &&
        ['disable', 'require', 'verify-full'].includes(network.tls)
    );
};

export const copyProfile = ({ id, name, connection }: ConnectionProfile): ConnectionProfile => ({
    id,
    name,
    connection: {
        engineId: 'postgres',
        database: connection.database,
        network: {
            host: connection.network.host,
            port: connection.network.port,
            user: connection.network.user,
            tls: connection.network.tls,
        },
    },
});
