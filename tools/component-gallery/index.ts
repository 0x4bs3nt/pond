import type { GalleryOptions } from './types';
import { Command, Option } from 'commander';
import { scenarios } from './scenarios';
import { palettes } from './palettes';

const program = new Command()
    .name('gallery')
    .description('Exercise Pond components with isolated mock props.')
    .addOption(
        new Option('-s, --scenario <id>', 'initial scenario').choices(scenarios.map((item) => item.id)).default('wide')
    )
    .addOption(
        new Option('-t, --theme <name>', 'gallery-only palette preview')
            .choices(Object.keys(palettes))
            .default('default')
    )
    .option('--list', 'list scenarios without starting the terminal UI');

program.action(async (options: GalleryOptions) => {
    if (options.list) {
        process.stdout.write(scenarios.map((item) => `${item.id}: ${item.description}`).join('\n') + '\n');

        return;
    }
    const { runGallery } = await import('./run-gallery');
    await runGallery(options.scenario, options.theme);
});

await program.parseAsync();
