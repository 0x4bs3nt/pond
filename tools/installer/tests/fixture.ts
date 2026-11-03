import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync, symlinkSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { InstallOptions } from './types';

const installer = resolve(import.meta.dir, '../../../install.sh');

export const createFixture = () => {
    const root = mkdtempSync(join(tmpdir(), 'pond-installer-test-'));
    const home = join(root, "home with 'quotes' $dollars");

    const bin = join(root, 'commands');
    const downloads = join(root, 'downloads');
    const temporary = join(root, 'temporary');

    for (const path of [home, bin, downloads, temporary]) mkdirSync(path);

    const command = (name: string, source: string) => {
        const path = join(bin, name);
        writeFileSync(path, `#!/bin/sh\n${source}\n`);
        chmodSync(path, 0o755);
    };

    command('uname', 'if [ "$1" = -s ]; then echo "$TEST_OS"; else echo "$TEST_CPU"; fi');
    command('ldd', 'echo "$TEST_LIBC"');
    command('sysctl', 'echo "$TEST_TRANSLATED"');

    const mv = Bun.which('mv')!;
    command('mv', `[ "$TEST_SWITCH_FAILURE" != true ] || exit 1\nexec '${mv}' "$@"`);
    command(
        'curl',
        `output=
while [ "$#" -gt 0 ]; do
    case "$1" in
        --output) output=$2; shift 2 ;;
        *) url=$1; shift ;;
    esac
done
case "$url" in
    */latest) printf 'https://github.com/0x4bs3nt/pond/releases/tag/v%s' "$TEST_VERSION" ;;
    */download/v"$TEST_VERSION"/*)
        [ "$TEST_INTERRUPTED" != true ] || { printf partial > "$output"; exit 18; }
        cp "$TEST_DOWNLOADS/\${url##*/}" "$output" ;;
    *) exit 22 ;;
esac`
    );

    const installDir = join(home, '.local/bin');
    const run = (options: InstallOptions = {}, args: string[] = ['--no-modify-path']) => {
        const version = options.version ?? '0.3.3';
        const os = options.os ?? 'Linux';
        const cpu = options.cpu ?? 'x86_64';
        const libc = options.libc ?? 'GLIBC 2.39';
        const arch = options.translated || ['aarch64', 'arm64'].includes(cpu) ? 'arm64' : 'x64';
        const target = `${os === 'Darwin' ? 'darwin' : 'linux'}-${arch}${os === 'Linux' && libc.includes('musl') ? '-musl' : ''}`;
        const stage = mkdtempSync(join(root, 'archive-'));

        mkdirSync(join(stage, 'licenses'));

        writeFileSync(join(stage, 'LICENSE'), 'Pond license');
        writeFileSync(join(stage, 'licenses/NOTICE'), 'Dependency notices');
        writeFileSync(join(stage, 'pond'), `#!/bin/sh\n${options.badExecutable ? 'exit 1' : `echo ${version}`}\n`);

        chmodSync(join(stage, 'pond'), 0o755);

        if (options.unsafeLink) symlinkSync('/tmp', join(stage, 'unsafe'));

        const archive = `pond-v${version}-${target}.tar.gz`;
        const packed = spawnSync('tar', ['-czf', join(downloads, archive), '-C', stage, '.']);

        if (packed.status !== 0) throw new Error(packed.stderr.toString());
        if (options.archive) copyFileSync(options.archive, join(downloads, archive));
        if (options.unsafePath) {
            const tar = gunzipSync(readFileSync(join(downloads, archive)));
            tar.fill(0, 0, 100);
            tar.write('../escape/', 0);
            tar.fill(32, 148, 156);
            const checksum = tar.subarray(0, 512).reduce((sum, byte) => sum + byte, 0);
            tar.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
            writeFileSync(join(downloads, archive), gzipSync(tar));
        }

        const hash = options.corrupt
            ? '0'.repeat(64)
            : createHash('sha256')
                  .update(readFileSync(join(downloads, archive)))
                  .digest('hex');

        writeFileSync(join(downloads, 'SHA256SUMS'), `${hash}  ${archive}\n`);

        return spawnSync('sh', [installer, ...args], {
            encoding: 'utf8',
            timeout: 10000,
            env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                HOME: home,
                TMPDIR: temporary,
                SHELL: options.shell ?? '/bin/bash',
                XDG_CONFIG_HOME: join(home, '.config'),
                ZDOTDIR: home,
                TEST_OS: os,
                TEST_CPU: cpu,
                TEST_LIBC: libc,
                TEST_TRANSLATED: options.translated ? '1' : '0',
                TEST_VERSION: version,
                TEST_DOWNLOADS: downloads,
                TEST_INTERRUPTED: String(options.interrupted ?? false),
                TEST_SWITCH_FAILURE: String(options.switchFailure ?? false),
            },
        });
    };

    return { root, home, installDir, temporary, run };
};
