import { afterEach, describe, expect, test } from 'bun:test';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createFixture } from './fixture';

describe.skipIf(process.platform === 'win32')('Unix installer', () => {
    const roots: string[] = [];
    const fixture = () => {
        const result = createFixture();
        roots.push(result.root);

        return result;
    };
    afterEach(() => {
        for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
    });

    // Packaging CI exercises the actual compiled executable on each native Unix target.
    test.skipIf(!process.env.POND_PACKAGE_TARGET || process.platform === 'win32')(
        'installs the native build through verification and launches the installed executable',
        () => {
            const target = process.env.POND_PACKAGE_TARGET!;
            const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
            const f = fixture();
            const result = f.run({
                version,
                os: target.startsWith('darwin') ? 'Darwin' : 'Linux',
                cpu: target.includes('arm64') ? 'arm64' : 'x86_64',
                libc: target.endsWith('musl') ? 'musl libc' : 'GLIBC',
                archive: join(process.cwd(), 'dist', target, `pond-v${version}-${target}.tar.gz`),
            });
            expect(result.stderr).toBe('');
            expect(result.status).toBe(0);
            expect(spawnSync(join(f.installDir, 'pond'), ['--version'], { encoding: 'utf8' }).stdout.trim()).toBe(
                version
            );
        },
        30000
    );

    test.each([
        ['Linux', 'x86_64', 'GLIBC 2.39'],
        ['Linux', 'aarch64', 'GNU libc 2.39'],
        ['Linux', 'x86_64', 'musl libc'],
        ['Linux', 'aarch64', 'musl libc'],
        ['Darwin', 'x86_64', ''],
        ['Darwin', 'arm64', ''],
    ])('installs the matching %s %s %s release with licenses', (os, cpu, libc) => {
        const f = fixture();
        const result = f.run({ os, cpu, libc });
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        const executable = join(f.installDir, 'pond');
        expect(spawnSync(executable, ['--version'], { encoding: 'utf8' }).stdout.trim()).toBe('0.3.3');
        expect(readFileSync(join(readlinkSync(executable), '../licenses/NOTICE'), 'utf8')).toBe('Dependency notices');
        expect(readdirSync(f.temporary)).toEqual([]);
        expect(existsSync(join(f.home, '.bashrc'))).toBe(false);
    });

    test('Rosetta selects Apple Silicon and explicit versions accept a v prefix', () => {
        const f = fixture();
        const result = f.run({ os: 'Darwin', translated: true }, ['--version', 'v0.3.3', '--no-modify-path']);

        expect(result.status).toBe(0);
        expect(readlinkSync(join(f.installDir, 'pond'))).toContain('darwin-arm64');
    });

    test('upgrades and repeat installs keep the old executable and its notices intact', () => {
        const f = fixture();
        expect(f.run().status).toBe(0);
        const old = readlinkSync(join(f.installDir, 'pond'));
        expect(f.run({ version: '0.3.4' }, ['--version', '0.3.4', '--no-modify-path']).status).toBe(0);
        expect(f.run({ version: '0.3.4' }).status).toBe(0);
        expect(spawnSync(old, ['--version'], { encoding: 'utf8' }).stdout.trim()).toBe('0.3.3');
        expect(spawnSync(join(f.installDir, 'pond'), ['--version'], { encoding: 'utf8' }).stdout.trim()).toBe('0.3.4');
    });

    test.each(['corrupt', 'interrupted', 'badExecutable', 'unsafeLink', 'unsafePath', 'switchFailure'] as const)(
        '%s failure preserves the working installation and cleans temporary files',
        (failure) => {
            const f = fixture();
            expect(f.run().status).toBe(0);
            const original = readlinkSync(join(f.installDir, 'pond'));
            const before = readdirSync(join(f.installDir, '.pond'));
            expect(f.run({ version: '0.3.4', [failure]: true }).status).not.toBe(0);
            expect(readlinkSync(join(f.installDir, 'pond'))).toBe(original);
            expect(readdirSync(join(f.installDir, '.pond'))).toEqual(before);
            expect(readdirSync(f.temporary)).toEqual([]);
        }
    );

    test('refuses unsupported systems and ambiguous libc before installation', () => {
        const f = fixture();
        for (const options of [{ os: 'FreeBSD' }, { cpu: 'riscv64' }, { libc: 'unknown' }]) {
            expect(f.run(options).status).not.toBe(0);
        }
        expect(existsSync(f.installDir)).toBe(false);
    });

    test('does not overwrite an executable managed by another installer', () => {
        const f = fixture();
        mkdirSync(f.installDir, { recursive: true });
        writeFileSync(join(f.installDir, 'pond'), 'existing executable');
        expect(f.run().status).not.toBe(0);
        expect(readFileSync(join(f.installDir, 'pond'), 'utf8')).toBe('existing executable');
        expect(readdirSync(f.temporary)).toEqual([]);
    });

    test('respects another installation lock without removing it or changing the launcher', () => {
        const f = fixture();
        expect(f.run().status).toBe(0);
        const original = readlinkSync(join(f.installDir, 'pond'));
        const lock = join(f.installDir, '.pond/install.lock');
        mkdirSync(lock);
        expect(f.run({ version: '0.3.4' }).status).not.toBe(0);
        expect(existsSync(lock)).toBe(true);
        expect(readlinkSync(join(f.installDir, 'pond'))).toBe(original);
        expect(readdirSync(f.temporary)).toEqual([]);
    });

    test.each(['bash', 'zsh', 'fish'])('writes one quoted PATH entry for %s across repeat installs', (shell) => {
        const f = fixture();
        const physicalBin = join(f.home, 'physical bin');
        mkdirSync(physicalBin);
        mkdirSync(join(f.home, '.local'));
        symlinkSync(physicalBin, f.installDir);
        const first = f.run({ shell: `/bin/${shell}` }, []);
        expect(first.status).toBe(0);
        expect(first.stdout).toContain('Added Pond to PATH');
        expect(first.stdout).toContain('Open a new terminal and run pond');
        const repeated = f.run({ shell: `/bin/${shell}` }, []);
        expect(repeated.status).toBe(0);
        expect(repeated.stdout).toContain('Pond is already configured on PATH');
        expect(repeated.stdout).toContain('Open a new terminal and run pond');
        const config = join(f.home, shell === 'fish' ? '.config/fish/config.fish' : `.${shell}rc`);
        const content = readFileSync(config, 'utf8');
        expect(content.match(/# Pond installer/g)?.length).toBe(1);

        if (Bun.which(shell)) {
            const result = spawnSync(
                shell,
                [
                    '-c',
                    shell === 'fish' ? 'source $argv[1]; command -v pond' : 'source "$1"; command -v pond',
                    ...(shell === 'fish' ? [config] : [shell, config]),
                ],
                {
                    encoding: 'utf8',
                    env: { ...process.env, HOME: f.home, XDG_CONFIG_HOME: join(f.home, '.config') },
                }
            );
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe(join(realpathSync(f.installDir), 'pond'));
        }
    });
});
