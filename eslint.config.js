import babelParser from '@babel/eslint-parser';
import boundaries from 'eslint-plugin-boundaries';

// Each folder is a module. Imports inside a module may use private files;
// imports from another module must go through its index.ts.
const layers = {
    app: ['domain', 'ports', 'adapters', 'services', 'state', 'features', 'components', 'theme', 'platform', 'shared'],
    domain: ['domain', 'shared'],
    ports: ['ports', 'domain', 'shared'],
    adapters: ['adapters', 'ports', 'domain', 'platform', 'shared'],
    services: ['services', 'ports', 'domain', 'shared'],
    state: ['state', 'domain', 'shared'],
    features: ['features', 'components', 'services', 'state', 'domain', 'ports', 'theme', 'platform', 'shared'],
    components: ['components', 'theme', 'shared'],
    theme: ['shared'],
    platform: ['platform', 'ports', 'domain', 'shared'],
    shared: ['shared'],
};

const lintFiles = ['src/**/*.{ts,tsx}', 'tools/**/*.{ts,tsx,js,mjs}', 'eslint.config.js'];
const testFiles = '**/*.{test,spec}.{ts,tsx,js,mjs}';
const publicApiPolicy = {
    disallow: {
        to: { element: { fileInternalPath: '!index.ts' }, module: { origin: 'local' } },
    },
    message: 'Import another module through its index.ts public API.',
};
const internalPolicy = { allow: { dependency: { relationship: { to: 'internal' } } } };

// Keep this last: even app/platform permissions and same-module access must not
// allow production code to load a test suite or the test runner.
const testIsolationPolicy = {
    // Ordinary files have no file-category descriptor; they still belong to
    // their architectural element. Match them as well as categorized tooling.
    from: [{ file: { isUnknown: true } }, { file: { categories: { noneOf: ['test'] } } }],
    disallow: [{ to: { file: { categories: 'test' } } }, { to: { module: { source: 'bun:test' } } }],
    message: 'Production files must not import test files or bun:test.',
};

export default [
    { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'docs/**', '.direnv/**'] },
    {
        files: lintFiles,
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            'no-restricted-syntax': [
                'error',
                { selector: 'FunctionDeclaration', message: 'Use an arrow function for standalone functions.' },
                {
                    selector:
                        'FunctionExpression:not(MethodDefinition > FunctionExpression):not(Property[method=true] > FunctionExpression):not(Property[kind="get"] > FunctionExpression):not(Property[kind="set"] > FunctionExpression)',
                    message: 'Use an arrow function for function expressions and callbacks.',
                },
            ],
        },
    },
    {
        files: ['src/**/*.{ts,tsx}', 'tools/**/*.{ts,tsx}'],
        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false,
                babelOptions: { babelrc: false, configFile: false, parserOpts: { plugins: ['typescript', 'jsx'] } },
            },
        },
    },
    {
        files: lintFiles,
        plugins: { boundaries },
        settings: {
            'import/resolver': { typescript: { project: './tsconfig.json' } },
            'boundaries/files': [
                { pattern: testFiles, category: 'test' },
                { pattern: 'eslint.config.js', category: 'tooling' },
            ],
            'boundaries/elements': [
                { type: 'tooling', pattern: 'tools' },
                { type: 'adapters', pattern: 'src/adapters/databases/*' },
                ...Object.keys(layers).map((type) => ({
                    type,
                    pattern: ['app', 'theme'].includes(type) ? `src/${type}` : `src/${type}/*`,
                })),
            ],
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'boundaries/no-unknown-files': 'error',
            'boundaries/no-unknown-dependencies': ['error', { require: 'element' }],
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    checkAllOrigins: true,
                    checkInternals: true,
                    policies: [
                        ...Object.entries(layers).map(([type, allowed]) => ({
                            from: { element: { type } },
                            allow: { to: { element: { types: allowed } } },
                        })),
                        publicApiPolicy,
                        internalPolicy,
                        {
                            from: { element: { types: ['app', 'adapters', 'platform'] } },
                            allow: { to: { module: { origin: ['external', 'core'] } } },
                        },
                        {
                            from: { element: { types: ['components', 'features'] } },
                            allow: {
                                to: { module: { origin: 'external', source: ['react', 'react/*', '@opentui/*'] } },
                            },
                        },
                        {
                            from: { element: { type: 'state' } },
                            allow: {
                                to: { module: { origin: 'external', source: 'zustand' } },
                                dependency: { source: 'zustand/vanilla' },
                            },
                        },
                        {
                            from: { element: { type: 'features' } },
                            allow: {
                                to: { module: { origin: 'external', source: 'zustand' } },
                                dependency: { source: 'zustand' },
                            },
                        },
                        {
                            from: { file: { categories: 'test' } },
                            allow: { to: { module: { source: 'bun:test' } } },
                        },
                        testIsolationPolicy,
                    ],
                },
            ],
        },
    },
    {
        files: ['tools/**/*.{ts,tsx,js,mjs}', 'eslint.config.js'],
        rules: {
            'boundaries/dependencies': [
                'error',
                {
                    default: 'allow',
                    checkAllOrigins: true,
                    checkInternals: true,
                    policies: [publicApiPolicy, internalPolicy, testIsolationPolicy],
                },
            ],
        },
    },
];
