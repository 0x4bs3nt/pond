export type InstallOptions = {
    archive?: string;
    version?: string;
    os?: string;
    cpu?: string;
    libc?: string;
    corrupt?: boolean;
    interrupted?: boolean;
    badExecutable?: boolean;
    unsafeLink?: boolean;
    unsafePath?: boolean;
    switchFailure?: boolean;
    shell?: string;
    translated?: boolean;
};
