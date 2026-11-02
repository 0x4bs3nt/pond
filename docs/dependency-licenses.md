# Binary redistribution review

Review date: 2026-11-02. Runtime: Bun 1.4.2. Renderer: OpenTUI 0.6.8.

## Review scope and result

The identified notice omissions are addressed. Archives carry Pond's MIT license, installed JavaScript/OpenTUI notices, Bun's upstream inventory, the WebKit and TinyCC LGPL texts, and a collected runtime third-party notice bundle. Source access and rebuilding directions accompany them. This review checks the declared dependencies and pinned source distributions; it is not a binary-derived software bill of materials or a claim that every upstream source file has been independently audited.

The runtime collection covers:

- Native dependency notices from Bun 1.4.2's build definitions, including supplementary notices for BoringSSL, libarchive, libjpeg-turbo, and ls-hpack's xxHash.
- JavaScriptCore/WTF notices from Bun's exact WebKit revision, including ICU and simdutf.
- Source distributions in Bun's Cargo and JavaScript fallback lockfiles, plus the pinned Rust standard-library source distribution. These are conservative supersets that also include build/test and other-platform packages.
- Node's notices for Bun's vendored Node/Acorn code, and attribution references in Bun's upstream inventory. Legacy attribution snapshots whose revisions are not pinned by Bun are explicitly identified as such.
- The Independent JPEG Group acknowledgment and source-access information for LGPL- and MPL-covered components.

The 326 component records in `tools/packaging/licenses/provenance.json` identify source URLs, downloaded archive hashes where applicable, notice paths, and notice hashes. License texts and retained source/README notice sections are collected in `THIRD-PARTY-NOTICES.txt`. Its SHA-256 is recorded in the provenance file. The component count describes collection records, not the number of libraries linked into Pond.

## Build and archive protection

Packaging rejects a Bun version that differs from the notice collection and rejects an altered notice bundle. The extracted-archive smoke check verifies the bundle, LGPL texts, source directions, and provenance file against the checked-in materials. Installed package notice copying also includes `COPYRIGHT` files.

The regression test checks a valid collection, an altered bundle, and a missing LGPL text. Run `bun run check`, `bun run build`, and `bun run package:check` after changes. All three platform packaging jobs must pass before promotion; the local check covers Linux only.

## Source access and maintenance

See [the shipped source directions](../tools/packaging/licenses/SOURCES.md) for exact Bun/WebKit/TinyCC sources, Bun patches, and rebuilding Pond with a modified runtime. Rust/MPL component sources are available at the archive URLs in the provenance file. Pond imposes no additional restriction on modifying or debugging those components.

A complete custom WebKit/Bun rebuild was not performed; smoke checks exercise the official pinned runtime. Do not describe those checks as proof of a source rebuild or byte-for-byte reproducibility.

When upgrading Bun, repeat this review against its native build definitions, WebKit revision, Cargo lockfile, fallback lockfile, and Rust toolchain. Preserve full license/copyright texts, source references, applicable acknowledgments, and patches. Refresh the collection and its hashes together; changing the version field alone does not constitute a review. Recheck installed OpenTUI native notices when upgrading the renderer. Network downloads belong in the review/update process, not ordinary notice copying during builds.

References: [Bun 1.4.2 inventory and source](https://github.com/oven-sh/bun/tree/bun-v1.4.2), [WebKit pin](https://github.com/oven-sh/bun/blob/bun-v1.4.2/scripts/build/deps/webkit.ts), and [TinyCC pin](https://github.com/oven-sh/bun/blob/bun-v1.4.2/scripts/build/deps/tinycc.ts).
