export type PullRequest = {
    number: number;
    title: string;
    body: string | null;
    state: string;
    merged: boolean;
    merge_commit_sha: string | null;
    base: { ref: string; sha: string };
    head: { ref: string; sha: string; repo: { full_name: string } | null };
};

export type ReleasePlan = {
    version: string;
    previousTag: string | null;
    pullRequest: number;
    title: string;
    notes: string;
};

export type PublishedRelease = {
    id: number;
    tag_name: string;
    target_commitish: string;
    draft: boolean;
    prerelease: boolean;
    assets: { name: string }[];
};

export type ReleaseContext = {
    sha: string;
    tag: string;
    plan: ReleasePlan;
    hasMatchingTag: boolean;
};
