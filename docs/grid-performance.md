# Grid responsiveness validation

## Reproduce

```sh
bun run gallery:bench
bun run gallery:bench --rows 250
bun run gallery:bench --value-length 65536 --steps 100
bun run gallery:bench --steps 500 --rounds 16
bun run gallery --scenario stress
bun run gallery --scenario long-values
```

The benchmark prints JSON to stdout. It renders the public `DataGrid` through OpenTUI's headless test renderer at 120 × 36. Each sample measures keyboard dispatch, React updates, and a completed render. It warms up for 30 movements, then repeats a 100-input cycle: first/last-row jumps, Home, 24 right movements, End, 24 left movements, Home, and vertical navigation. This scrolls columns in both directions and jumps to both horizontal boundaries. Use at least 100 steps for a complete cycle; shorter runs cover only its prefix. A 1 ms yield outside the timed sample allows deferred work between inputs. Forced GC runs before memory samples, outside the timed region.

It reports cold initial-render time, per-round p50/p95/max latency, peak rendered nodes, minimum/maximum selected column indexes, retained User Timing measures, JavaScript heap, and process RSS. The benchmark uses the same timing cleanup as application and gallery startup. This is a renderer benchmark, not terminal-output latency, a database benchmark, or a CI timing threshold. It excludes editor and selected-value-preview costs. Native rendering, runtime allocation, and the harness all contribute to RSS.

Fixtures have 100,000 logical rows and 256 columns by default. Rows share 32 immutable cell patterns to keep data allocation from dominating renderer measurements. The long-value run places a 65,536 UTF-16-unit value in the first column; other columns contain short labels. This does not simulate allocating millions of independent large values. Gallery stress fixtures are allocated lazily and retained once per fixture for that gallery process.

## Results — 2026-11-01

Environment: Linux x64, AMD Ryzen 9 7900X, Bun 1.4.2, OpenTUI core/react 0.6.8. The baseline grid came from commit `32ac5cf`; both versions used the same benchmark and fixtures. The original results below used the earlier workload, which moved only between columns 0 and 1 and did not exercise horizontal scrolling. They remain a historical comparison of vertical navigation and preview processing. The corrected workload is recorded separately below; do not directly compare latency across different workloads. Results are not guarantees for other machines. Raw measurements are in [grid-results.json](performance/grid-results.json).

| Dataset / implementation          | Steps per round | p50 (ms)    | p95 (ms)    | Peak nodes | Final GC heap (MiB) |
| --------------------------------- | --------------- | ----------- | ----------- | ---------- | ------------------- |
| 100k × 256, baseline              | 300             | 1.96–2.13   | 3.50–3.89   | 463        | 25.22               |
| 100k × 256, updated               | 300             | 1.14–1.25   | 1.99–2.46   | 463        | 24.62               |
| 250 × 256, updated                | 300             | 1.20–1.35   | 2.17–3.26   | 463        | 15.8                |
| 100k × 256, long values, baseline | 100             | 13.17–14.02 | 19.85–20.62 | 463        | 37.59               |
| 100k × 256, long values, updated  | 100             | 1.74–1.92   | 2.82–3.65   | 463        | 24.34               |

Long-value cold render dropped from 103.55 ms to 51.50 ms. Worst measured long-value input/render samples dropped from about 78 ms to about 18 ms. Similar node counts and steady-state timings for 250 and 100,000 rows support viewport-bounded rendering; the additional fixture rows still consume memory.

Changes made:

- Reuse stateless row and column viewport slots instead of recreating native nodes as logical rows scroll. Event callbacks still address the current logical cell.
- Bound grid cell/header preview processing before normalization and native text rendering. The prefix budget is proportional to column width with an 8,192 UTF-16-unit ceiling. Discard the final potentially partial grapheme and append an ellipsis when capped. Original values, editors, and pending-change buffers are untouched.
- Skip viewport state updates when revealing a selection does not move the viewport.
- Consume and discard delivered User Timing measures in the shared app/gallery lifecycle and benchmark. React development measurements no longer accumulate a process-wide history; CPU profiles and performance marks remain available. Live observers still receive their entries.
- Size the row-number gutter for the dataset, including six-digit row numbers.

There is no value cache. The grid mounts visible rows and intersecting columns; preview processing is bounded even for very long inputs. Column positioning still computes metadata for the supplied columns, and horizontal visibility scans that metadata. No additional cache or indexing optimization was justified by these measurements.

## Corrected horizontal-scrolling workload

The current benchmark identifies its workload as `mixed-axis-v2`. These fresh runs use the same environment and dataset sizes as above, but include sustained horizontal scrolling and first/last-column jumps. Per-round `minColumn` and `maxColumn` report observed zero-based selection indexes; all recorded rounds reached 0 and 255.

| Run                        | Steps × rounds | p50 (ms)  | p95 (ms)  | Peak nodes |
| -------------------------- | -------------- | --------- | --------- | ---------- |
| Ordinary values            | 300 × 3        | 1.24–1.60 | 5.34–6.22 | 463        |
| Long values                | 100 × 3        | 2.06–2.44 | 6.91–9.02 | 463        |
| Sustained mixed navigation | 500 × 16       | 1.30–1.48 | 5.27–6.63 | 463        |

The corrected 8,000-input soak retained zero measures each round. GC heap ranged from 22.59 to 24.82 MiB; RSS ranged from 180.71 to 212.47 MiB and ended at 193.20 MiB. Rendered nodes remained bounded while scrolling both axes. The higher p95 values reflect the broader workload; they are not a before/after regression comparison. Raw records are stored under `mixedAxisNormal`, `mixedAxisLong`, and `mixedAxisSoak` in the results JSON. Earlier grid records are labeled `original-vertical-v1`.

## Interaction validation

| Scenario                                        | Method and result                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sustained movement and far-row jumps            | Repeatable headless runs; node count remained 463 through 8,000 measured inputs.                                                                                                                              |
| Native viewport reuse                           | Regression test verifies text, headers, row 10,000, and mouse targeting after jumping and returning.                                                                                                          |
| Very large live grid                            | Linux PTY at 100 × 30: Ctrl+End reached row 100,000, End reached column 256, and q restored/exited the terminal successfully.                                                                                 |
| Unicode and long input                          | Regression tests cover CJK, emoji/ZWJ sequences, combining marks, long combining clusters, NULL, empty text, and exact numeric strings. Preview limits preserve source data.                                  |
| Empty results, editing, focus, palettes, resize | Temporary interaction harness exercised all nine gallery scenarios with all three palettes, keyboard/mouse scenario changes, NULL staging/reset, and editor preservation through 45 × 12 → 100 × 30 resizing. |
| Workspace pending edits                         | Existing integration test extended through 60 × 16, 40 × 10, and 100 × 24 resizing; staged edits survive and explicit discard restores the original value. Existing tab/editor focus checks also pass.        |

No routine gallery snapshots or timing assertions were added. Headless checks do not establish visual correctness in every terminal/font. macOS, Windows, and other terminal implementations were not exercised.

## Memory finding and resolution

An intermediate 4,000-input soak held 463 nodes and approximately 24.7 MiB of GC heap but grew from 135.75 MiB to 832.07 MiB RSS. Stable JS heap alone was not sufficient evidence of bounded memory.

A separate control updated 170 plain OpenTUI text nodes, without React or Pond, for 2,000 frames. RSS fluctuated between 78 and 91 MiB. Inspection of the installed React development reconciler showed User Timing measures emitted during commits. Clearing those measures removed the sustained growth in the grid reproduction.

The shared lifecycle now observes measures and clears them after delivery; shutdown disconnects the observer and clears remaining measures. The benchmark uses that same cleanup. This deliberately removes process-wide measure history from `performance.getEntries*`: future diagnostics must consume live observers and retain only a bounded set of samples. Performance marks, `performance.now()`, and CPU profiles are unaffected. A regression test verifies delivery to another observer, removal of retained measures, preservation of marks, and cleanup disposal. No timing payloads are logged.

With cleanup enabled, the longer 8,000-input soak recorded:

- 463 rendered nodes in every round.
- Zero retained measures after each round.
- 22.61–24.81 MiB GC heap across the sampled rounds.
- 170.93–205.95 MiB RSS across the sampled rounds, ending at 178.90 MiB rather than rising linearly.
- 1.78–3.13 ms per-round p95 input-to-render latency.

These observations resolve the reproduced retention problem. They demonstrate a stable sampled envelope, not a guarantee that every runtime or future workload is leak-free. Keep the benchmark for future comparisons and repeat the validation when upgrading Bun, React, or OpenTUI.

## Release readiness

The phase 1 scope is validated on this Linux environment, including existing editing/tab tests and the gallery scenarios. After this change is reviewed and merged into `dev`, prepare the planned 0.2.0 release promotion. Other operating systems and terminal/font combinations remain unvalidated; packaging and real database workloads belong to later tickets.
