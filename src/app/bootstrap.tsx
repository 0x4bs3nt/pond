import { Command } from 'commander';
import { version } from '../../package.json';
import type { LogsCommandOptions } from './types';

const startedAtMs = performance.now();

const program = new Command()
    .name('pond')
    .description('A terminal database workspace. Run without a command to open the app.')
    .version(version)
    .showHelpAfterError()
    .action(async () => {
        const { runTui } = await import('./run-tui');

        await runTui(startedAtMs);
    });

program
    .command('logs')
    .description('Print the latest Pond log')
    .option('-f, --follow', 'Stream new log records until Ctrl+C', false)
    .action(async (options: LogsCommandOptions) => {
        const { runLogsCommand } = await import('./logs-command');

        process.exitCode = await runLogsCommand(options);
    });

await program.parseAsync(process.argv);
