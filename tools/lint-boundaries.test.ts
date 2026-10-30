import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ESLint } from 'eslint';

let root: string;
let eslint: ESLint;

beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'pond-boundaries-'));

    const fixtures = [
        'components/grid/index.ts',
        'components/grid/private.ts',
        'components/grid/helpers.test.ts',
        'components/grid/helpers.spec.tsx',
        'components/inputs/index.ts',
        'services/browsing/index.ts',
        'adapters/databases/postgres/index.ts',
        'features/browser/index.ts',
        'features/browser/private.ts',
        'state/workspace/index.ts',
        'domain/data/index.ts',
        'ports/database/index.ts',
        'theme/index.ts',
        'app/helpers.test.ts',
        'unmapped/private.ts',
    ];
    for (const file of fixtures) {
        const target = join(root, 'src', file);

        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, 'export const item = 1;');
    }

    await mkdir(join(root, 'tools'), { recursive: true });
    await writeFile(join(root, 'tools/helpers.test.ts'), 'export const item = 1;');
    await writeFile(
        join(root, 'tsconfig.json'),

        JSON.stringify({
            compilerOptions: {
                moduleResolution: 'bundler',
                paths: { '@features/*': ['./src/features/*'] },
            },
        })
    );
    eslint = new ESLint({
        cwd: root,
        overrideConfigFile: resolve('eslint.config.js'),
        overrideConfig: {
            settings: {
                'boundaries/root-path': root,
                'import/resolver': { typescript: { project: join(root, 'tsconfig.json') } },
            },
        },
    });
});

afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
});

test.each([
    ['components/grid/probe.ts', './private'],
    ['components/grid/probe.ts', '../inputs'],
    ['components/grid/probe.ts', '../../theme'],
    ['services/browsing/probe.ts', '../../ports/database'],
    ['app/probe.ts', '../features/browser'],
    ['components/grid/probe.ts', 'react'],
    ['state/workspace/probe.ts', 'zustand/vanilla'],
    ['features/browser/probe.ts', 'zustand'],
    ['features/browser/probe.ts', '../../state/workspace'],
    ['components/grid/probe.test.ts', './private'],
    ['components/grid/probe.test.ts', './helpers.test'],
    ['components/grid/probe.spec.tsx', 'bun:test'],
])('allows valid dependency from %s to %s', async (filePath, source) => {
    const [result] = await eslint.lintText(`import { item } from '${source}';`, { filePath: `src/${filePath}` });
    expect(result?.messages).toEqual([]);
});

test.each([
    ['components/grid/probe.ts', '../../services/browsing'],
    ['components/grid/probe.ts', '../../state/workspace'],
    ['components/grid/probe.ts', '../../adapters/databases/postgres'],
    ['services/browsing/probe.ts', '../../adapters/databases/postgres'],
    ['services/browsing/probe.ts', '../../features/browser'],
    ['adapters/databases/postgres/probe.ts', '../../../state/workspace'],
    ['adapters/databases/postgres/probe.ts', '../../../features/browser'],
    ['state/workspace/probe.ts', 'react'],
    ['state/workspace/probe.ts', 'zustand'],
    ['components/grid/probe.ts', 'zustand'],
    ['components/grid/probe.ts', 'zustand/vanilla'],
    ['services/browsing/probe.ts', 'zustand/vanilla'],
    ['domain/data/probe.ts', '@opentui/core'],
    ['components/grid/probe.ts', 'pg'],
])('rejects invalid layer dependency from %s to %s', async (filePath, source) => {
    const [result] = await eslint.lintText(`import { item } from '${source}';`, { filePath: `src/${filePath}` });
    expect(result?.messages.some((message) => message.ruleId === 'boundaries/dependencies')).toBe(true);
});

test.each([
    "import { item } from '../features/browser/private';",
    "import type { Item } from '../features/browser/private';",
    "export { item } from '../features/browser/private';",
    "const load = () => import('../features/browser/private');",
    "const item = require('../features/browser/private');",
    "import { item } from '@features/browser/private';",
])('rejects imports that bypass public APIs: %s', async (code) => {
    const [result] = await eslint.lintText(code, { filePath: 'src/app/probe.ts' });
    expect(result?.messages.some((message) => message.message.includes('index.ts public API'))).toBe(true);
});

test.each([
    ['src/app/probe.ts', "import './helpers.test';"],
    ['src/components/grid/probe.ts', "import { item } from './helpers.test';"],
    ['src/components/grid/probe.tsx', "import type { Item } from './helpers.spec';"],
    ['src/components/grid/index.ts', "export { item } from './helpers.test';"],
    ['src/components/grid/probe.ts', "const load = () => import('./helpers.test');"],
    ['src/components/grid/probe.ts', "const item = require('./helpers.test');"],
    ['src/app/probe.ts', "import { test } from 'bun:test';"],
    ['src/components/grid/probe.ts', "import { test } from 'bun:test';"],
    ['tools/probe.ts', "import './helpers.test';"],
    ['tools/probe.ts', "import { test } from 'bun:test';"],
    ['eslint.config.js', "import { test } from 'bun:test';"],
])('isolates production file %s from test code: %s', async (filePath, code) => {
    const [result] = await eslint.lintText(code, { filePath });
    expect(result?.messages.some((message) => message.message.includes('must not import test files or bun:test'))).toBe(
        true
    );
});

test.each(['tools/probe.test.ts', 'tools/probe.spec.js', 'src/app/probe.test.tsx'])(
    'allows the test runner in %s',
    async (filePath) => {
        const [result] = await eslint.lintText("import { test } from 'bun:test';", { filePath });
        expect(result?.messages).toEqual([]);
    }
);

test('rejects source files outside the declared layers', async () => {
    const [result] = await eslint.lintText('export const item = 1;', { filePath: 'src/unmapped/private.ts' });
    expect(result?.messages.some((message) => message.ruleId === 'boundaries/no-unknown-files')).toBe(true);
});

test('rejects imports from unclassified source folders', async () => {
    const [result] = await eslint.lintText("import { item } from '../unmapped/private';", {
        filePath: 'src/app/probe.ts',
    });
    expect(result?.messages.some((message) => message.ruleId === 'boundaries/no-unknown-dependencies')).toBe(true);
});
