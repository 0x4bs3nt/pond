import { expect, test } from 'bun:test';
import { selectTarget } from '../index';

test('keeps glibc and musl archives distinct on both Linux architectures', () => {
    expect(selectTarget({ platform: 'linux', arch: 'x64', libc: 'glibc' })).toBe('linux-x64');
    expect(selectTarget({ platform: 'linux', arch: 'x64', libc: 'musl' })).toBe('linux-x64-musl');
    expect(selectTarget({ platform: 'linux', arch: 'arm64', libc: 'glibc' })).toBe('linux-arm64');
    expect(selectTarget({ platform: 'linux', arch: 'arm64', libc: 'musl' })).toBe('linux-arm64-musl');
    expect(() => selectTarget({ platform: 'linux', arch: 'x64', libc: null })).toThrow('No build configuration');
});

test('selects native Intel and ARM builds and rejects unsupported CPUs', () => {
    expect(selectTarget({ platform: 'darwin', arch: 'x64', libc: null })).toBe('darwin-x64');
    expect(selectTarget({ platform: 'darwin', arch: 'arm64', libc: null })).toBe('darwin-arm64');
    expect(selectTarget({ platform: 'win32', arch: 'x64', libc: null })).toBe('windows-x64');
    expect(selectTarget({ platform: 'win32', arch: 'arm64', libc: null })).toBe('windows-arm64');
    expect(() => selectTarget({ platform: 'win32', arch: 'ia32', libc: null })).toThrow('No build configuration');
});
