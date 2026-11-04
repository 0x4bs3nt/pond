import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

export const profileDirectory = (env = process.env, platform = process.platform, home = homedir()) => {
    if (env.POND_CONFIG_DIR && isAbsolute(env.POND_CONFIG_DIR)) return env.POND_CONFIG_DIR;

    if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'Pond');
    if (platform === 'win32') return join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'Pond');

    const config = env.XDG_CONFIG_HOME && isAbsolute(env.XDG_CONFIG_HOME) ? env.XDG_CONFIG_HOME : join(home, '.config');

    return join(config, 'pond');
};
