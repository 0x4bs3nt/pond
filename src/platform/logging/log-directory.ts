import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

export const logDirectory = (env = process.env, platform = process.platform, home = homedir()) => {
    if (env.POND_LOG_DIR && isAbsolute(env.POND_LOG_DIR)) return env.POND_LOG_DIR;

    if (platform === 'darwin') return join(home, 'Library', 'Logs', 'Pond');
    if (platform === 'win32') return join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'Pond', 'logs');

    const state =
        env.XDG_STATE_HOME && isAbsolute(env.XDG_STATE_HOME) ? env.XDG_STATE_HOME : join(home, '.local', 'state');

    return join(state, 'pond', 'logs');
};
