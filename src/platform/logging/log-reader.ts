import { constants } from 'node:fs';
import { open, readdir, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT';

const latestLog = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
        if (missing(error)) return [];

        throw error;
    });

    const files = [];
    for (const entry of entries) {
        if (!entry.isFile() || !/^pond-\d+\.jsonl$/.test(entry.name)) continue;

        const path = join(directory, entry.name);
        const info = await stat(path).catch((error) => {
            if (missing(error)) return undefined;
            throw error;
        });

        if (info) files.push({ path, info });
    }

    files.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs || a.path.localeCompare(b.path));

    return files[0];
};

export const createLogReader = (directory: string, write: (bytes: Buffer) => Promise<void>) => {
    let file: FileHandle | undefined;
    let identity = '';
    let offset = 0;

    const positions = new Map<string, number>();

    const drain = async () => {
        if (!file) return;

        const size = (await file.stat()).size;
        if (size < offset) offset = 0;
        const buffer = Buffer.alloc(64 * 1024);

        while (offset < size) {
            const { bytesRead } = await file.read(buffer, 0, Math.min(buffer.length, size - offset), offset);
            if (!bytesRead) break;

            await write(buffer.subarray(0, bytesRead));
            offset += bytesRead;
        }

        positions.set(identity, offset);
        if (positions.size > 32) positions.delete(positions.keys().next().value!);
    };

    const close = async () => {
        const previous = file;
        file = undefined;

        await previous?.close();
    };

    const poll = async () => {
        await drain();

        const latest = await latestLog(directory);
        if (!latest) return Boolean(file);

        const next = await open(latest.path, constants.O_RDONLY | constants.O_NOFOLLOW).catch((error) => {
            if (missing(error)) return undefined;

            throw error;
        });

        if (!next) return Boolean(file);
        const info = await next.stat().catch(async (error) => {
            await next.close();
            throw error;
        });

        if (!info.isFile()) {
            await next.close();

            return Boolean(file);
        }

        const nextIdentity = `${latest.path}:${info.dev}:${info.ino}:${info.birthtimeMs}`;
        if (nextIdentity !== identity) {
            await drain();
            await close();

            file = next;
            identity = nextIdentity;
            offset = positions.get(identity) ?? 0;
        } else {
            await next.close();
        }

        await drain();

        return true;
    };

    return { poll, close };
};
