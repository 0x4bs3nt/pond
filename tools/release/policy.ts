import type { ReleasePlan } from './types';
export const initialVersion = '0.1.0';

export const parseVersion = (version: string): [number, number, number] => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw new Error(`Expected a stable SemVer version, received: ${version}`);
    }

    const parts = version.split('.').map(Number);
    if (!parts.every(Number.isSafeInteger)) throw new Error('Version exceeds safe integer range.');

    return parts as [number, number, number];
};

export const nextVersion = (previous: string | null, title: string, body: string): string => {
    const match = /^([a-z]+)(?:\([^()\r\n]+\))?(!)?: \S[^\r\n]*$/.exec(title);
    if (!match) throw new Error('Use a Conventional Commit release PR title, such as feat: add table editing.');

    const breaking = Boolean(match[2]) || /^BREAKING[ -]CHANGE: \S/m.test(body);
    if (!breaking && !['feat', 'fix', 'perf'].includes(match[1] ?? '')) {
        throw new Error('A release PR must use feat:, fix:, perf:, or declare a breaking change.');
    }

    const releaseAs = /^Release-As: (.+)$/m.exec(body)?.[1]?.trim();
    if (releaseAs) {
        if (releaseAs !== '1.0.0' || !previous?.startsWith('0.')) {
            throw new Error('Release-As is only supported for explicitly graduating from 0.x to 1.0.0.');
        }

        return releaseAs;
    }

    if (previous === null) return initialVersion;
    const [major, minor, patch] = parseVersion(previous);

    if (breaking) return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
    if (match[1] === 'feat') return `${major}.${minor + 1}.0`;

    return `${major}.${minor}.${patch + 1}`;
};

export const createPlan = (previousTag: string | null, number: number, title: string, body: string): ReleasePlan => ({
    version: nextVersion(previousTag?.slice(1) ?? null, title, body),
    previousTag,
    pullRequest: number,
    title,
    notes: `${title} (#${number})${body.trim() ? `\n\n${body.trim()}` : ''}`,
});

export const renderChangelog = (plan: ReleasePlan, previous: string): string => {
    const history = previous.replace(/^# Changelog\s*/, '').trim();

    return `# Changelog\n\n## ${plan.version}\n\n${plan.notes}\n${history ? `\n${history}\n` : ''}`;
};
