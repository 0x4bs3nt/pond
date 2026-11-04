# Installing Pond

The published 0.3.4 release uses mock data. PostgreSQL browsing is planned for 0.4.0. Bun is not required to run a release executable.

## Unix installer

Once `install.sh` is merged into `main`, install on Linux or macOS with:

```sh
curl -fsSL https://raw.githubusercontent.com/0x4bs3nt/pond/main/install.sh | sh
```

To download and inspect the script before running it:

```sh
curl -fsSL https://raw.githubusercontent.com/0x4bs3nt/pond/main/install.sh -o pond-install.sh
less pond-install.sh
sh pond-install.sh
```

The script detects x64 or ARM64, chooses glibc or musl on Linux, and handles macOS Rosetta. It resolves the latest stable GitHub release once, downloads its archive and `SHA256SUMS`, checks SHA-256 before extraction, rejects unsafe paths and archive links, and checks `pond --version` before activating the installation. Checksums detect corruption; they are not an independent publisher signature.

Requirements: a POSIX shell, curl, tar with gzip support, standard Unix utilities, and either `sha256sum` or `shasum`. Linux also needs an identifiable `ldd --version`. Unsupported platforms or unidentified libc fail with guidance instead of guessing.

Options:

```sh
sh pond-install.sh --version 0.3.3
sh pond-install.sh --install-dir "$HOME/bin"
sh pond-install.sh --no-modify-path
```

Versions accept an optional `v` prefix. Installation directories must be absolute, without colons or line breaks. No sudo is used. Windows users should download the matching `.zip` from [GitHub Releases](https://github.com/0x4bs3nt/pond/releases); a PowerShell installer is separate work.

## Files and PATH

The default launcher is `~/.local/bin/pond`. Complete packages, including licenses, live in private versioned directories under `~/.local/bin/.pond/`. A symlink selects the active executable. With `--install-dir`, both the launcher and `.pond/` move to that directory.

If the installation directory is absent from PATH, the installer adds a quoted entry to the detected shell's configuration:

- Bash: `~/.bashrc`.
- Zsh: `$ZDOTDIR/.zshrc`, falling back to `~/.zshrc`.
- Fish: `$XDG_CONFIG_HOME/fish/config.fish`, falling back to `~/.config/fish/config.fish`.

Repeated runs do not duplicate the entry. Open a new terminal after installation. Custom Bash login setups must source `.bashrc` themselves. Unknown shells receive manual guidance. Read-only configuration does not undo a successful installation.

Use `--no-modify-path` when managing PATH through Nix/Home Manager or another configuration system. Run the displayed full executable path until PATH is configured. An existing Pond command elsewhere on PATH can shadow this installation; inspect `command -v pond` if the version is unexpected.

## Upgrades, recovery, and removal

Exit Pond and rerun the installer to upgrade, or select a version explicitly to roll back. A repeat installation verifies a fresh copy. Downloads and validation finish before the launcher switches atomically; a failed attempt preserves the previous launcher. Existing executables or unrelated symlinks are never overwritten. Choose another installation directory when switching from a package manager.

Previous package directories are retained for recovery, so repeated installations consume disk space. Inspect the launcher with `readlink ~/.local/bin/pond`; once satisfied, remove only older, inactive `release-*` directories under `.pond/`. Do not remove the directory referenced by the launcher.

Concurrent installations in the same directory are rejected. An uncatchable termination or power loss can leave `.pond/install.lock` or a staged release behind. After confirming no installer is running, remove the stale lock directory before retrying. Normal errors and catchable termination clean temporary files.

To uninstall a default installation, remove `~/.local/bin/pond` and `~/.local/bin/.pond/`, then remove the `# Pond installer` entry and its following PATH line from shell configuration. For a custom directory, use its corresponding paths. Local logs are retained; see [log locations](error-handling.md).

## Platform limitations

NixOS may require `nix-ld` and runtime libraries. The installer validates execution and fails before activation when those are unavailable; it does not modify system configuration. Native nixpkgs distribution is tracked in #45.

macOS builds are unsigned/not notarized, and Windows builds are unsigned. OS security prompts can still apply. The installer does not remove quarantine attributes or disable protections. See [packaging](packaging.md) for supported targets and validation limits.

Homebrew (#47), AUR (#46), and nixpkgs (#45) remain separate distribution work.
