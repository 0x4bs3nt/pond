import { Client } from 'pg';

const connection = {
    host: '127.0.0.1',
    port: 5432,
    user: 'pond',
    password: '',
    ssl: false,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    application_name: 'pond-seed',
};

const seed = async () => {
    const admin = new Client({ ...connection, database: 'postgres' });

    try {
        await admin.connect();

        const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'pond_dev'");
        if (!existing.rowCount) await admin.query('CREATE DATABASE pond_dev');
    } finally {
        await admin.end();
    }

    const database = new Client({ ...connection, database: 'pond_dev' });
    try {
        await database.connect();

        const existing = await database.query("SELECT 1 FROM pg_namespace WHERE nspname = 'pond_demo'");
        if (existing.rowCount) {
            console.info('pond_dev.pond_demo already exists; existing data was left unchanged.');

            return;
        }

        await database.query('BEGIN');
        try {
            await database.query(await Bun.file(new URL('./seed_postgres.sql', import.meta.url)).text());
            await database.query('COMMIT');
        } catch (error) {
            await database.query('ROLLBACK');

            throw error;
        }

        console.info(
            'Seeded pond_dev, schema pond_demo. Connect to 127.0.0.1:5432 as pond, empty password, TLS disabled.'
        );

    } finally {
        await database.end();
    }
};

try {
    await seed();
} catch {
    console.error(
        'Could not seed PostgreSQL. Start nix run path:./tools/postgres and check tools/scripts/seed_postgres/seed_postgres.sql.'
    );

    process.exitCode = 1;
}
