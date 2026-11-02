# Building and distributing Pond

## Build and validate

Install Bun **1.4.2**, Git, and the platform's archive tools (`tar`; Windows also uses Windows PowerShell). From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run package:check
```

Builds are native: run these commands on the target OS and CPU. `build` downloads an official Bun runtime whose npm tarball URL and SHA-512 integrity are pinned in `tools/packaging/targets.json`. This avoids inheriting Nix-specific interpreter paths from the development Bun. OpenTUI and other dependency versions come from `bun.lock`; CI always uses frozen installation. Update the runtime integrity pins and `buildBunVersion` together when upgrading Bun, then repeat packaged-app validation.

The build uses `--compile --minify --bytecode --format=esm --sourcemap`, with automatic `.env` and `bunfig.toml` loading disabled. Linux selects OpenTUI's glibc native library. Bytecode reduces startup work; embedded runtime and native assets account for most executable size. A local Linux experiment reduced median warm `--version` time from about 36 ms to 11 ms, with the executable growing from about 91 to 97 MiB. These are command startup measurements, not full UI latency guarantees.

Output lives under ignored `dist/<target>/`: an unpacked `package/`, a versioned archive, a checksum sidecar, and a build manifest identifying version, commit, runtime, target, size, and archive SHA-256. Archives include source maps, Pond's license, Bun's upstream licensing information, and installed dependency notices (including native renderer notices). Builds are repeatable from pinned inputs but archives are not promised to be byte-for-byte reproducible across rebuilds. Local manifests identify HEAD; uncommitted edits can be present. Only clean CI checkouts are publishable release inputs.

## Initial platform matrix

| Target         | CI environment         | Runtime choice          | Validation status                                                    |
| -------------- | ---------------------- | ----------------------- | -------------------------------------------------------------------- |
| `linux-x64`    | Ubuntu 24.04           | Bun x64 baseline, glibc | Ubuntu CI and manual NixOS checks passed                             |
| `darwin-arm64` | macOS 15 Apple Silicon | Bun ARM64               | CI and manual Tahoe 26.6 checks passed; Gatekeeper override required |
| `windows-x64`  | Windows Server 2025    | Bun x64 baseline        | CI and manual Windows 11 checks passed; unknown-publisher prompt     |

All three targets passed [PR CI](https://github.com/0x4bs3nt/pond/actions/runs/41364494005) and maintainer manual testing. All three are required for publication. The initial support envelope is the listed CI systems plus manually verified systems; older OS versions are not certified. Both Linux ELF objects reference glibc symbols up to 2.17, but that inspection alone does not validate older distributions. x64 builds explicitly select Bun's baseline target; native OpenTUI compatibility must also pass on the intended CPU. Linux ARM64, Intel macOS, Windows ARM64, musl/Alpine, and 32-bit systems are outside this first matrix.

The generic Linux executable uses `/lib64/ld-linux-x86-64.so.2`. NixOS may need `nix-ld` and appropriate runtime libraries; do not assume the generic archive works on every NixOS configuration. The local test machine can run it. A native Nix package is tracked separately in #45.

macOS builds are not Developer ID signed/notarized; Bun may apply an ad-hoc signature. Windows builds are not Authenticode signed. Downloaded binaries may trigger Gatekeeper or Windows reputation warnings. Test the actual browser-downloaded archive, not only files produced locally. Do not disable platform protection globally. Trusted signing/notarization is follow-up work requiring the maintainer's certificates/accounts; checksums verify file consistency, not publisher identity.

## Archive smoke checks

`package:check` verifies the archive hash, extracts into a temporary directory outside the checkout, and launches the extracted executable with an empty PATH. It checks version/help without log creation, starts the real renderer through a PTY/ConPTY, sends normal quit, checks terminal restoration and lifecycle records, and runs the log reader. Temporary data is removed afterward. This proves the bundled runtime works without Bun on PATH; it does not substitute for interactive terminal testing.

Before advertising a target, manually check the downloaded archive on a fresh machine: launch, grid navigation, mouse input, cell editing/cancel/stage, tabs, resize, logs/follow, and normal/Ctrl+C exit. Check terminal restoration and OS installation prompts. Exercise an upgrade by replacing the executable with a newer archive and confirming `pond --version` changes while logs remain readable. Record OS/CPU and results in the PR. The current mock app has no saved database profiles to migrate.

## Release workflow

PR CI builds and smoke-tests all three targets with read-only repository permissions when the PR changes application code, packaging/release tooling, workflows, dependency manifests/locks, build configuration, or license files. Documentation-only PRs skip packaging. Downloadable CI artifacts are named `pond-linux-x64`, `pond-darwin-arm64`, and `pond-windows-x64`. Pushes to `dev` and `main` run normal CI checks without producing duplicate package artifacts. The release workflow rebuilds the exact successful `main` commit, smoke-tests each archive, and passes only archives/manifests to the publishing job. Only the publisher receives release write permission.

The publisher validates version/commit/target/checksums, generates `SHA256SUMS`, creates a draft, uploads and downloads each asset to verify its bytes, then publishes. Missing required builds block publication. An interrupted upload leaves a draft. Retry the failed jobs using the original successful build artifacts (retained for 14 days): identical remote assets are reused and missing draft assets are uploaded. Different remote bytes, conflicting tags, or incomplete already-public releases fail closed. Rebuilding may produce different archive bytes; never delete or replace published assets to make a retry pass. Investigate first; a corrected public binary belongs in a new release.

## Manual installation and distribution follow-ups

Download the matching archive and `SHA256SUMS` from the same GitHub release. Verify the archive's SHA-256 against its entry using `sha256sum` (Linux), `shasum -a 256` (macOS), or `Get-FileHash -Algorithm SHA256` (PowerShell). Extract to a dedicated directory and run `./pond` or `.\pond.exe`. Add that directory to PATH for the `pond` command. Bun is not required.

For an upgrade, exit Pond, verify and extract the newer archive, then replace the dedicated installation directory and check `pond --version`. Keep the previous archive if rollback is needed. To uninstall, remove that directory and its PATH entry; local logs remain in the documented OS state location unless explicitly deleted. See [error handling](error-handling.md).

The maintainer owns release artifact updates. Nixpkgs (#45), AUR (#46), Homebrew (#47), and the Unix installer (#48) will consume these versioned artifacts or build the same pinned sources. Their delivery paths/submissions are not implemented here. PowerShell and npm distribution also remain follow-ups. #44 stays open until its remaining platform/manual-validation and distribution acceptance criteria are resolved; implementing this pipeline does not by itself complete the whole ticket.
