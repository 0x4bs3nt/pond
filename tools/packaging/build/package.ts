import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { archiveName, buildBunVersion, describeArtifact, hostTarget, run, targets } from '../index';
import type { BuildContext, BuildManifest } from '../types';

export const prepareBuild = async (): Promise<BuildContext> => {
    if (Bun.version !== buildBunVersion) throw new Error(`Build with Bun ${buildBunVersion}; found ${Bun.version}.`);

    const root = resolve(import.meta.dir, '../../..');
    process.chdir(root);
    const target = hostTarget();
    const { version } = await Bun.file('package.json').json();

    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a stable package version.');

    const out = resolve('dist', target);
    const stage = join(out, 'package');

    await rm(out, { recursive: true, force: true });
    await mkdir(stage, { recursive: true });

    return {
        root,
        target,
        version,
        commit: run(['git', 'rev-parse', 'HEAD']),
        out,
        stage,
        runtime: resolve('dist/runtime', target),
    };
};

export const compileExecutable = ({ target, stage }: BuildContext, runtimeExecutable: string) => {
    const config = targets[target];
    const executable = process.platform === 'win32' ? 'pond.exe' : 'pond';

    run([
        process.execPath,
        'build',
        '--compile',
        `--target=${config.compile}`,
        `--compile-executable-path=${runtimeExecutable}`,
        '--minify',
        '--bytecode',
        '--format=esm',
        '--sourcemap',
        '--no-compile-autoload-dotenv',
        '--no-compile-autoload-bunfig',
        ...(config.libc ? ['--define', `process.env.OPENTUI_LIBC=${JSON.stringify(config.libc)}`] : []),
        'src/app/bootstrap.tsx',
        '--outfile',
        join(stage, executable),
    ]);
};

export const writeBuildMetadata = async ({ version, commit, target, stage }: BuildContext) => {
    await Bun.write(
        join(stage, 'build.json'),
        JSON.stringify({ version, commit, target, bun: buildBunVersion }, null, 2)
    );
};

export const writeManifest = async ({ version, commit, target, out }: BuildContext) => {
    const name = archiveName(version, target);
    const manifest: BuildManifest = {
        version,
        commit,
        target,
        bun: buildBunVersion,
        archive: await describeArtifact(join(out, name), name),
    };

    await Bun.write(join(out, `${target}.json`), JSON.stringify(manifest, null, 2) + '\n');
    await Bun.write(join(out, `${name}.sha256`), `${manifest.archive.sha256}  ${name}\n`);
};
