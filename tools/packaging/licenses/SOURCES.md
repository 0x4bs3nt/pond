# Runtime source and rebuilding

Pond is MIT licensed. Its executable also contains Bun and OpenTUI; those components retain their respective licenses. The included `BUN-LICENSE.md` is Bun's upstream inventory, not a replacement for individual library license terms.

The `build.json` included in this archive identifies the exact Pond commit. Obtain it from `https://github.com/0x4bs3nt/pond/tree/<commit>`, including `bun.lock` and `tools/packaging/`. Source access is public and does not require purchasing Pond.

## Bun 1.4.2

- Bun source/build instructions and dependency pins: https://github.com/oven-sh/bun/tree/bun-v1.4.2
- Bun patches: https://github.com/oven-sh/bun/tree/bun-v1.4.2/patches
- WebKit/JavaScriptCore source: https://github.com/oven-sh/WebKit/tree/2e2aa2290fac856d6f451ceacb58f7f5b44dd057
- TinyCC source: https://github.com/oven-sh/tinycc/tree/05f0fafaa3be31e31d7b4b5c17dc60f62c991171
- TinyCC patches used by Bun: https://github.com/oven-sh/bun/tree/bun-v1.4.2/patches/tinycc

The WebKit and TinyCC revisions above are taken from Bun 1.4.2's `scripts/build/deps/webkit.ts` and `tinycc.ts`. Their license texts accompany this file as `WEBKIT-COPYING.LIB` and `TINYCC-COPYING`.

Follow the build instructions at that Bun tag to build Bun with a modified WebKit or TinyCC. Bun's upstream license guide describes cloning WebKit into `vendor/WebKit`, selecting its pinned revision with `bun sync-webkit-source`, and running `bun run build:local`. Preserve Bun's applicable patches when rebuilding TinyCC. This is a source rebuild procedure; Pond's normal packaging script intentionally downloads an unmodified pinned runtime.

To compile Pond with a rebuilt runtime, install Pond's locked dependencies and invoke the rebuilt Bun directly, explicitly supplying that same executable as `--compile-executable-path`. Use the compile flags in `tools/packaging/build/package.ts` and the platform target in `tools/packaging/targets.json`; select glibc for the existing Linux target. Do not use `bun run build` for this purpose, because it replaces the runtime with the official pinned download. Modified builds can be run locally; they will not carry the original release checksums or any original publisher signature.

## OpenTUI and JavaScript dependencies

OpenTUI 0.6.8 source is available at https://github.com/anomalyco/opentui/tree/v0.6.8. The exact JavaScript/native package versions and integrity hashes are recorded in Pond's `bun.lock`. Installed package license notices are included in this archive's `licenses/` directory. Native renderer notices include Ghostty, LCMS2, libwebp, STB, and Wuffs notices supplied by the OpenTUI native package.
