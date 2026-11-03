# Runtime diagnostics measurement contract

This records step 1 of [#43](https://github.com/0x4bs3nt/pond/issues/43). Application diagnostic collection and report export are not implemented yet. The capability probe below is development tooling, not a benchmark. Bun remains pinned to 1.4.2.

## Renderer measurements

Checked against installed OpenTUI core/react 0.6.8 and its renderer implementation. Upstream [rendering diagnostics](https://opentui.com/docs/test-and-debug/rendering-diagnostics/) documents the public units; newer upstream releases may expose additional fields that this version does not have.

| Public measurement                              | Interpretation                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `frame` event and `frameId`                     | Completed renderer presentation; the native pending-presentation promise is awaited before emission. Not physical terminal display latency.     |
| `getStats().frameTimes`                         | Bounded JavaScript render-pass durations in milliseconds, including awaited work; not CPU-only time or frame intervals. Requires `gatherStats`. |
| `frameCallbackTime`                             | Time spent in the frame-callback phase, in milliseconds. Not React component render time.                                                       |
| `nativeLastFrameTime`, `nativeAverageFrameTime` | Native frame intervals in microseconds. Keep separate from processing durations.                                                                |
| `nativeRenderTime`, `nativeStdoutWriteTime`     | Optional native work/write durations in microseconds. Missing means unavailable, not zero.                                                      |
| `frameCount`, `nativeFrameCount`                | JavaScript loop attempts versus completed native frames. Do not assume equality.                                                                |
| `cellsUpdated`                                  | Changed terminal cells, not bytes or application rows. Zero does not mean no frame completed.                                                   |

Normalize durations to milliseconds at the collector boundary. Read native statistics in the frame callback, but defer reading the JavaScript pass sample until a microtask: this version emits `frame` **before** appending that pass to `frameTimes`. Keep the frame ID attached to the deferred read and avoid aggregating the entire rolling history repeatedly. `resetStats()` clears JavaScript history/counters but does not reset native counters; collectors should use their own baselines instead.

`getSchedulerState()` exposes running, rendering, and scheduled-work state. During `frame`, rendering is still active; take idle samples outside the callback. Demand-driven inactivity is healthy. A stale FPS snapshot or a long interval after idle is not evidence of slow rendering. Do not enable continuous rendering to obtain samples.

## Startup and interaction boundaries

Use monotonic `performance.now()` timestamps. Startup begins at an explicit bootstrap marker before loading the TUI and ends with a completed frame after the usable workspace commits. Runtime initialization before the marker is excluded. Renderer creation or a blank setup frame is not a usable workspace. A minimum-size warning must not be counted as workspace readiness.

Input arrival alone cannot establish which frame contains its effect. The probe demonstrates three key events producing one commit/frame, an ignored input producing none, and an unrelated render completing afterward.

The collector implementation must use these rules:

- Give supported actions opaque sequence IDs and fixed categories; retain timestamps, never keys, text, cell contents, or table names.
- Associate an action with the resulting state revision, then acknowledge that revision at commit. React Profiler is optional and must not be required for this acknowledgment.
- Accept only a completed frame whose attempt began after the acknowledgment (`frameId` greater than the ID observed at acknowledgment). This conservatively excludes an already in-flight frame that might contain the old scene. Do not force an extra render just to obtain a measurement.
- Keep coalesced actions in one bounded batch, report its size and first/last input latency, and do not claim intermediate states were individually displayed.
- Explicitly count unmatched, superseded, expired, and dropped actions. Ignored input must never inherit the latency of a later unrelated frame. Ambiguous cases are excluded from correlated latency statistics.
- Native editor changes can bypass React commits. A separate editor change/cursor acknowledgment is needed; until verified in step 4, report those samples as unsupported or uncorrelated. Do not label a generic input-to-next-frame measurement as editing latency.

This is a conservative correlation contract, not a proof of pixel presentation. Step 4 must validate in-flight commits and editor acknowledgments with the actual workspace. The small probe only establishes the batching/no-op cases and the need for correlation.

## React Profiler capability

On Linux x64 with Bun 1.4.2, React 19.3.1, and OpenTUI 0.6.8, the probe observed:

| Execution mode                                | Profiler callbacks                                   |
| --------------------------------------------- | ---------------------------------------------------- |
| Source, default development mode              | Mount and update                                     |
| Source with `NODE_ENV=production`             | None, despite confirmed commits and rendered updates |
| Compiled with Pond's current release flags    | Mount and update; bundled mode was development       |
| Same compilation plus explicit `--production` | None; bundled mode was production                    |

The last two results are significant: despite Bun 1.4.2's CLI help saying `--compile` implies production, the current command selected development React here. A separate build of the actual `src/app/bootstrap.tsx` with the same release flags and `--metafile` also listed `react.development.js` and `react-reconciler.development.js`. Setting `NODE_ENV=production` when running the already compiled development probe did not change its bundled mode.

Do not change release flags as part of this measurement step. Record the actual build mode and collector availability in future reports; development and production results are not interchangeable. Absence of Profiler callbacks after confirmed commits means unavailable, not zero render duration. Never silently switch to development React to obtain production measurements. Profiler `actualDuration` and `baseDuration` are React render costs, not native frame/output durations; nested boundaries must not be summed as independent work.

## Reproduce the capability probe

From the checkout with locked dependencies installed:

```sh
bun tools/diagnostics/probe.tsx
NODE_ENV=production bun tools/diagnostics/probe.tsx
```

To reproduce the compiled comparison on Linux x64/glibc, first obtain the pinned official runtime through the documented [packaging build](packaging.md). Then:

```sh
bun build --compile --target=bun-linux-x64-baseline \
    --compile-executable-path=dist/runtime/linux-x64/package/bin/bun \
    --minify --bytecode --format=esm --sourcemap \
    --no-compile-autoload-dotenv --no-compile-autoload-bunfig \
    --define 'process.env.OPENTUI_LIBC="glibc"' \
    tools/diagnostics/probe.tsx --outfile /tmp/pond-diagnostics-probe
/tmp/pond-diagnostics-probe
```

Repeat with `--production` and a different output filename. The runtime path and target above are specific to Linux x64/glibc; other targets require their matching packaging configuration.

The probe uses OpenTUI's headless renderer and the real React root without `act`, which is unavailable in production React. It waits for a committed fixture revision and verifies the captured frame before recording each phase. JSON goes to stdout; no application log or diagnostic report is created. It unmounts and disposes the renderer and retains the existing timing-history cleanup.

Observed in all four modes: three inputs coalesced into one frame, the ignored input produced no frame, the explicit unrelated render produced one frame, and scheduler flags were false after flush. JavaScript sample counts advanced only after the frame callback. Timings vary and are not performance assertions.

Validation is headless on Linux x64 only. It establishes neither terminal write/display latency nor macOS/Windows behavior. Later steps must exercise real terminal cleanup, editor input, resizing, report output, and repeated sessions. No automated timing gate or new benchmark is introduced.
