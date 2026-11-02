import { appendFile, copyFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const statePath = process.env.POND_TEST_RELEASES!;
const state = await Bun.file(statePath).json();
const option = (name: string) => args[args.indexOf(name) + 1]!;

if (args[0] === 'api') {
    if (args.includes('--method') && option('--method') === 'POST' && args[1]!.endsWith('/releases')) {
        const payload = await Bun.file(option('--input')).json();
        const release = { ...payload, id: 1, prerelease: false, assets: [] };

        state.push(release);

        await Bun.write(statePath, JSON.stringify(state));
        await appendFile(process.env.POND_TEST_CALLS!, 'create\n' + JSON.stringify(payload) + '\n');

        console.log(JSON.stringify(release));
    } else if (args[1]!.includes('/pulls/')) console.log(await Bun.file(process.env.POND_TEST_PR!).text());
    else if (args[1]!.includes('/releases/tags/')) {
        const release = state.find(
            (item: { tag_name: string; draft: boolean }) => item.tag_name === args[1]!.split('/').at(-1) && !item.draft
        );

        if (!release) process.exit(1);

        console.log(JSON.stringify(release));
    } else if (/\/releases\/\d+$/.test(args[1]!)) {
        const release = state.find((item: { id: number }) => item.id === Number(args[1]!.split('/').at(-1)));
        if (!release) process.exit(1);

        console.log(JSON.stringify(release));
    } else console.log(JSON.stringify(process.env.POND_TEST_STALE_LIST === '1' ? [] : state));
} else {
    await appendFile(process.env.POND_TEST_CALLS!, args.join('\n') + '\n');

    switch (args[1]) {
        case 'upload': {
            if (process.env.POND_TEST_FAIL_UPLOAD === '1' && state[0].assets.length > 0) process.exit(1);

            const name = basename(args[3]!);
            await copyFile(args[3]!, join(process.env.POND_TEST_REMOTE!, name));
            state[0].assets.push({ name });

            break;
        }
        case 'download':
            await copyFile(
                join(process.env.POND_TEST_REMOTE!, option('--pattern')),
                join(option('--dir'), option('--pattern'))
            );

            break;
        case 'edit':
            state[0].draft = false;

            break;
        default:
            throw new Error('Unexpected gh command');
    }

    await Bun.write(statePath, JSON.stringify(state));
}
