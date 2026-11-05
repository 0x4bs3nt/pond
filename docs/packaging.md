# Building and distributing Pond

## Build and validate

Install Bun **1.4.2**, Git, and the platform's archive tools (`tar`; Windows also uses Windows PowerShell). From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run package:check
```

Builds are native: run these commands on the target OS and CPU. `build` downloads an official Bun runtime whose npm tarball URL and SHA-512 integrity are pinned in `tools/packaging/targets.json`. This avoids inheriting Nix-specific interpreter paths from the development Bun. OpenTUI and other dependency versions come from `bun.lock`; CI always uses frozen installation. Update the runtime integrity pins and `buildBunVersion` together when upgrading Bun, then repeat packaged-app validation.

The build uses `--compile --minify --bytecode --format=esm --sourcemap`, with automatic `.env` and `bunfig.toml` loading disabled. Linux selects the OpenTUI native library matching the build host's libc (glibc or musl). The runtime report distinguishes the two, so Alpine builds cannot be mislabeled as glibc archives. CI sets POND_PACKAGE_TARGET and fails if the detected OS/CPU/libc does not match the requested matrix entry. Bytecode reduces startup work; embedded runtime and native assets account for most executable size. A local Linux experiment reduced median warm `--version` time from about 36 ms to 11 ms, with the executable growing from about 91 to 97 MiB. These are command startup measurements, not full UI latency guarantees.

Output lives under ignored `dist/<target>/`: an unpacked `package/`, a versioned archive, a checksum sidecar, and a build manifest identifying version, commit, runtime, target, size, and archive SHA-256. Archives include source maps, Pond's license, Bun's upstream licensing information, and installed dependency notices (including native renderer notices). Builds are repeatable from pinned inputs but archives are not promised to be byte-for-byte reproducible across rebuilds. Local manifests identify HEAD; uncommitted edits can be present. Only clean CI checkouts are publishable release inputs.

The runtime notice collection, provenance, LGPL texts, and source/rebuild directions are included under `licenses/bun-runtime/`. Builds check its Bun version and bundle hash; extracted-archive checks verify the shipped files. Repeat the [dependency license review](dependency-licenses.md) when upgrading the runtime or renderer.

## Platform matrix

| Target             | Build and smoke-test environment                  | Runtime choice          | Validation status                               |
| ------------------ | ------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `linux-x64`        | Ubuntu 24.04                                      | Bun x64 baseline, glibc | Existing CI and manual NixOS checks passed      |
| `linux-arm64`      | Ubuntu 24.04 ARM64                                | Bun ARM64, glibc        | Native CI passed; no manual checks              |
| `linux-x64-musl`   | Pinned Bun 1.4.2 Alpine container on Ubuntu x64   | Bun x64 baseline, musl  | Native CI passed; no manual checks              |
| `linux-arm64-musl` | Pinned Bun 1.4.2 Alpine container on Ubuntu ARM64 | Bun ARM64, musl         | Native CI passed; no manual checks              |
| `darwin-arm64`     | macOS 15 Apple Silicon                            | Bun ARM64               | Existing CI and manual Tahoe 26.6 checks passed |
| `darwin-x64`       | macOS 15 Intel                                    | Bun x64 baseline        | Native CI passed; no manual checks              |
| `windows-x64`      | Windows Server 2025                               | Bun x64 baseline        | Existing CI and manual Windows 11 checks passed |
| `windows-arm64`    | Windows 11 ARM64                                  | Bun ARM64               | Native CI passed; no manual checks              |

All eight targets passed native packaging CI and are published in 0.3.3. The original three targets also passed maintainer manual testing; the five additions have automated-only validation. All eight packaging jobs must pass before publication; the publisher requires an archive and manifest for every configured target. Never bypass a failing platform job to publish an incomplete release.

All builds run on matching CPU architectures. Musl jobs build and run the complete smoke check inside an Alpine container pinned by multi-architecture image digest; checkout and artifact upload run on the Ubuntu host. This avoids requiring GitHub's glibc-based JavaScript actions to execute on musl. The container supplies Git, tar, and the native runtime dependencies. Normal builds need no container.

Support is limited to tested environments, not every OS version or distribution. Linux glibc and musl archives are distinct; Alpine users should select musl. x64 builds select Bun's baseline target, but that alone does not certify every old CPU or native renderer. Older OS releases and 32-bit CPUs are not validated. Record the actual OS/libc versions and manual results before broadening compatibility claims.

The generic Linux executable uses `/lib64/ld-linux-x86-64.so.2`. NixOS may need `nix-ld` and appropriate runtime libraries; do not assume the generic archive works on every NixOS configuration. The local test machine can run it. A native Nix package is tracked separately in #45.

macOS builds are not Developer ID signed/notarized; Bun may apply an ad-hoc signature. Windows builds are not Authenticode signed. Downloaded binaries may trigger Gatekeeper or Windows reputation warnings. Test the actual browser-downloaded archive, not only files produced locally. Do not disable platform protection globally. Trusted signing/notarization is follow-up work requiring the maintainer's certificates/accounts; checksums verify file consistency, not publisher identity.

## Archive smoke checks

`package:check` verifies the archive hash, extracts into a temporary directory outside the checkout, and launches the extracted executable with an empty PATH. It checks version/help without log creation, starts the real renderer through a PTY/ConPTY, waits for the connection screen before sending F2, and waits for the mock workspace before sending normal quit. Each screen transition and shutdown has a bounded wait with phase-specific failure messages; startup logging alone does not prove the UI is ready for input. It checks terminal restoration and lifecycle records and runs the log reader. Temporary data is removed afterward. This proves the bundled runtime works without Bun on PATH; it does not substitute for interactive terminal testing.

On available hardware, manually check the downloaded archive: launch, profile save/reload, PostgreSQL connection/password/retry/disconnect, F2 to the mock demo, grid navigation, mouse input, cell editing/cancel/stage, tabs, resize, logs/follow, and normal/Ctrl+C exit. Check terminal restoration and OS installation prompts. Record OS/CPU and results in the PR, distinguishing manual checks from automated-only validation. Upgrade validation belongs to each package-manager or installer delivery path (#45–#48), where its replacement and persistence behavior can be tested. Development builds now persist non-secret [connection profiles](connections.md); released 0.3.x builds have no profiles to migrate.

Unix packaging jobs also run `bun test tools/installer/tests` with `POND_PACKAGE_TARGET` set. This exercises installation of the actual native archive, alongside fixture tests for target selection, upgrades, shell quoting, and failure recovery. Ordinary `bun run check` runs the fixture tests and skips the native-archive case when no packaging target is set.

## Release workflow

PR CI builds and smoke-tests all configured targets with read-only repository permissions when the PR changes application code, packaging/release tooling, workflows, dependency manifests/locks, build configuration, or license files. Documentation-only PRs skip packaging. Downloadable CI artifacts are named `pond-<target>` using the matrix above. Pushes to `dev` and `main` run normal CI checks without producing duplicate package artifacts. The release workflow rebuilds the exact successful `main` commit, smoke-tests each archive, and passes only archives/manifests to the publishing job. Only the publisher receives release write permission.

The publisher validates version/commit/target/checksums, generates `SHA256SUMS`, creates a draft, uploads and downloads each asset to verify its bytes, then publishes. Missing required builds block publication. An interrupted upload leaves a draft. Retry the failed jobs using the original successful build artifacts (retained for 14 days): identical remote assets are reused and missing draft assets are uploaded. Different remote bytes, conflicting tags, or incomplete already-public releases fail closed. Rebuilding may produce different archive bytes; never delete or replace published assets to make a retry pass. Investigate first; a corrected public binary belongs in a new release.

## Manual installation and distribution follow-ups

Download the matching archive and `SHA256SUMS` from the same GitHub release. Verify the archive's SHA-256 against its entry using `sha256sum` (Linux), `shasum -a 256` (macOS), or `Get-FileHash -Algorithm SHA256` (PowerShell). Extract to a dedicated directory and run `./pond` or `.\pond.exe`. Add that directory to PATH for the `pond` command. Bun is not required.

For an upgrade, exit Pond, verify and extract the newer archive, then replace the dedicated installation directory and check `pond --version`. Keep the previous archive if rollback is needed. To uninstall, remove that directory and its PATH entry; local logs remain in the documented OS state location unless explicitly deleted. See [error handling](error-handling.md).

The maintainer owns release artifact updates. The [Unix installer](installation.md) (#48) consumes these versioned archives and is the remaining delivery path in #44. Its installation and upgrade checks belong to this scope. Nixpkgs (#45), AUR (#46), and Homebrew (#47) remain independent follow-ups and do not block #44. PowerShell and npm distribution also remain follow-ups.
