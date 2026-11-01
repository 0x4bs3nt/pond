import { run } from './index';

export const createArchive = (stage: string, archive: string) => {
    if (process.platform === 'win32') {
        process.env.POND_PACKAGE_STAGE = stage;
        process.env.POND_PACKAGE_ARCHIVE = archive;

        run([
            'powershell',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Compress-Archive -Path (Join-Path $env:POND_PACKAGE_STAGE "*") -DestinationPath $env:POND_PACKAGE_ARCHIVE',
        ]);
    } else {
        run(['tar', '-czf', archive, '-C', stage, '.']);
    }
};

export const extractArchive = (archive: string, destination: string) => {
    if (process.platform === 'win32') {
        process.env.POND_PACKAGE_ARCHIVE = archive;
        process.env.POND_PACKAGE_DESTINATION = destination;

        run([
            'powershell',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Expand-Archive -LiteralPath $env:POND_PACKAGE_ARCHIVE -DestinationPath $env:POND_PACKAGE_DESTINATION',
        ]);
    } else {
        run(['tar', '-xzf', archive, '-C', destination]);
    }
};
