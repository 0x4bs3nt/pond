import { expect, test } from 'bun:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();

test.each([
    ['function example() { return 1; }', 'no-restricted-syntax'],
    ['const example = function () { return 1; };', 'no-restricted-syntax'],
    ['[1].map(function (value) { return value; });', 'no-restricted-syntax'],
    ['const object = { method: function () { return this; } };', 'no-restricted-syntax'],
    ['var value = 1;', 'no-var'],
    ['let value = 1;', 'prefer-const'],
    ['const equal = 1 == "1";', 'eqeqeq'],
])('rejects %s using %s across source and tooling', async (code, ruleId) => {
    for (const filePath of [
        'src/app/style-probe.tsx',
        'tools/style-probe.ts',
        'tools/style-probe.js',
        'eslint.config.js',
    ]) {
        const [result] = await eslint.lintText(code, { filePath });

        expect(result?.messages.some((message) => message.ruleId === ruleId)).toBe(true);
    }
});

test.each([
    'const example = () => 1;',
    'const example = async () => 1;',
    'const object = { method() { return this; } };',
    'const object = { get value() { return 1; }, set value(value) {} };',
    'class Example { constructor() {} method() { return this; } get value() { return 1; } set value(value) {} }',
    'let value = 1; value += 1;',
    'const equal = 1 === 1;',
])('allows %s across source and tooling', async (code) => {
    for (const filePath of [
        'src/app/style-probe.tsx',
        'tools/style-probe.ts',
        'tools/style-probe.js',
        'eslint.config.js',
    ]) {
        const [result] = await eslint.lintText(code, { filePath });

        expect(result?.messages).toEqual([]);
    }
});
