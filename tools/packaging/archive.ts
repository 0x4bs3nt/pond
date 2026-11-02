import { run } from './index';

export const createArchive = (stage: string, archive: string) => {
    if (process.platform === 'win32') {
        run(
            [
                'powershell',
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                '$ErrorActionPreference = "Stop"; Compress-Archive -Path (Join-Path $env:POND_PACKAGE_STAGE "*") -DestinationPath $env:POND_PACKAGE_ARCHIVE',
            ],
            { POND_PACKAGE_STAGE: stage, POND_PACKAGE_ARCHIVE: archive }
        );
    } else {
        run(['tar', '-czf', archive, '-C', stage, '.']);
    }
};

export const extractArchive = (archive: string, destination: string) => {
    if (process.platform === 'win32') {
        run(
            [
                'powershell',
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                '$ErrorActionPreference = "Stop"; Expand-Archive -LiteralPath $env:POND_PACKAGE_ARCHIVE -DestinationPath $env:POND_PACKAGE_DESTINATION',
            ],
            { POND_PACKAGE_ARCHIVE: archive, POND_PACKAGE_DESTINATION: destination }
        );
    } else {
        run(['tar', '-xzf', archive, '-C', destination]);
    }
};
