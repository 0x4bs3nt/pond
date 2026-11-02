# Binary redistribution review

Review date: 2026-11-02. Runtime: Bun 1.4.2. Renderer: OpenTUI 0.6.8.

## Checked

- Pond includes its MIT license in the archive.
- The packaging script copies installed packages' top-level license, notice, copyright-author and patent files. The local Linux archive contains the JavaScript dependencies' notices and OpenTUI's native renderer notices, including its Ghostty, LCMS2, libwebp, STB, and Wuffs files.
- Bun's upstream `LICENSE.md` identifies JavaScriptCore/WebKit as LGPL and TinyCC as LGPL 2.1. The previous archive included this inventory but neither library's license text nor pinned source/rebuild directions.
- Added unmodified license texts from Bun's pinned WebKit and TinyCC sources, together with source and rebuild directions. The packaging script now includes these in `licenses/bun-runtime/`.

## Remaining verification

This is not a complete redistribution clearance. Bun's upstream inventory also names other native libraries and embedded JavaScript polyfills. Copying licenses from Pond's `node_modules` does not establish that notices for dependencies statically bundled inside the downloaded Bun executable are included. The upstream inventory links to licenses, but is not itself a complete collection of their copyright/license texts.

The runtime's complete third-party notice set and corresponding-source/relinking requirements still need to be checked against the shipped Bun binaries. The source revisions and upstream rebuild instructions have been inspected; a custom-runtime rebuild has not been exercised. Do not mark this review complete or infer full compliance from passing application tests.

References: [Bun 1.4.2 license inventory](https://github.com/oven-sh/bun/blob/bun-v1.4.2/LICENSE.md), [pinned WebKit dependency](https://github.com/oven-sh/bun/blob/bun-v1.4.2/scripts/build/deps/webkit.ts), [pinned TinyCC dependency](https://github.com/oven-sh/bun/blob/bun-v1.4.2/scripts/build/deps/tinycc.ts), and the upstream license texts in `tools/packaging/licenses/`.
