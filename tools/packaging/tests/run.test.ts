import { expect, test } from 'bun:test';
import { run } from '../index';

test('passes archive paths to a real subprocess without mutating the parent environment', () => {
    const previous = process.env.POND_PACKAGE_STAGE;
    const stage = "C:\\Pond builds\\user's $archive";
    const output = run([process.execPath, '-e', 'process.stdout.write(process.env.POND_PACKAGE_STAGE ?? "missing")'], {
        POND_PACKAGE_STAGE: stage,
    });
    expect(output).toBe(stage);
    expect(process.env.POND_PACKAGE_STAGE).toBe(previous);
});
