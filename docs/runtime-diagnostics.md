# Runtime diagnostics

Opt-in local diagnostics for [#43](https://github.com/0x4bs3nt/pond/issues/43) measure startup, grid navigation and editing, renderer/React work, and process resources. They use bounded in-memory collection and write reports on shutdown. Nothing is uploaded. Bun remains pinned to 1.4.2; this work does not change release build flags.

## Startup opt-in

Enable diagnostics for a TUI session with:

```sh
POND_DIAGNOSTICS=1 bun run start
POND_DIAGNOSTICS=1 bun run gallery
POND_DIAGNOSTICS=1 pond
```

The packaged command requires an executable built with this change. The variable is read at runtime; no separate diagnostics build is needed. Only the exact value `1` enables collection. An unset variable or any other value leaves collection disabled. On PowerShell, set `$env:POND_DIAGNOSTICS = '1'` before launching and remove it afterward with `Remove-Item Env:POND_DIAGNOSTICS`.

Opted-in sessions retain OpenTUI's history (300 pass durations), attach React Profiler boundaries, and start the bounded collectors below. There is no diagnostic overlay or per-frame terminal logging. Native automatic memory snapshots remain disabled; Pond owns resource sampling. Renderer destruction stops both diagnostic timers and removes listeners. Existing always-on timing-retention cleanup is unchanged.

App help/version/log commands and gallery help/listing bypass renderer creation even with opt-in enabled. Normal TUI runs still use OpenTUI's native rendering counters internally; disabling diagnostics means no optional JavaScript frame history or Pond diagnostic collectors, not disabling the renderer's own bookkeeping. Persistent application error logs remain enabled independently.

## Bounded collectors

The app and gallery create a diagnostic session after renderer creation only when enabled. Its `snapshot()` returns detached data and `stop()` is idempotent. Resource sampling and interaction expiry each use one unreferenced one-second timer. Disabled sessions do not read process resources, allocate histories, or attach collector listeners/timers. Queued collector callbacks are inert after stop.

Renderer distributions cover JavaScript pass/callback time, native interval/render/output time, and changed-cell counts. Each retains at most 512 numeric samples, with full-session count, minimum, maximum, and mean. Percentiles use nearest ranks from the **recent retained window**, not a random sample or a whole-session distribution. `percentileScope`, retained/evicted counts, and rejected-value counts make this limitation explicit. Empty or unavailable measurements return null summaries; zero remains a valid observation. Missing optional native timings have separate counters. The first native frame interval is excluded because it has no previous completed frame.

Resource sampling uses cumulative process user/system CPU deltas and actual monotonic elapsed time, not an assumed one-second interval. CPU percentage is relative to one core and can exceed 100%. RSS and JavaScript heap usage are in bytes; no garbage collection is forced. The timeline retains the latest 600 samples (roughly ten minutes at the nominal cadence), including elapsed/interval milliseconds, frame completions since the previous sample, and scheduler state at sampling time. Separate distributions preserve full-session resource aggregates. Invalid intervals/counter resets are counted and excluded.

Frame counts plus scheduler snapshots make rendering during a manually observed idle period inspectable. A scheduler snapshot describes only that instant, not the entire interval; it does not establish user inactivity. The collector neither labels every frame without input as a fault nor treats low idle FPS as failure. It never requests a frame or starts continuous rendering to collect data. `quietFrames` counts completions after two seconds without observed keyboard input, resize, or instrumented actions. Mouse activity outside measured actions and background work may still explain such frames; inspect the resource timeline during a deliberately idle period rather than treating this counter as an error.

Snapshots contain numeric metrics, scheduler booleans, and fixed metadata fields. They do not include native object dumps, raw input, data values, SQL, or arbitrary environment values. `NODE_ENV` is restricted to development/production/test/unset/other. Snapshot arrays/objects are detached from retained history. No output is saved or printed while the TUI is in use.

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

The app and gallery track grid selection changes, editor opening/closing, and actual native editor text changes. Navigation at a boundary that does not change selection creates no action. Explorer/tab navigation, editor cursor-only movements, and rejected validation are not currently correlated categories. Raw keys and edited text never enter the collector.

Supported actions receive opaque IDs. React state changes are acknowledged by a layout effect after the owning feature commits; native text edits are acknowledged by the editor's content-change callback. Only a frame whose attempt begins after acknowledgment is eligible (`frameId` greater than the ID observed at acknowledgment). An in-flight frame is conservatively excluded even if it might contain the change. No frame is forced for measurement, so ambiguous or unpresented actions can expire without a latency sample. This is a correlation proxy, not proof of pixel presentation.

Actions created synchronously during keyboard dispatch use the observed input timestamp. Actions without that timestamp use an explicitly separate action-to-frame distribution. Each category/origin batch records its first action's latency; `lastInBatchToFrameMs` records its last action's latency, combining origins. Correlated and coalesced counts expose batching; intermediate states are not claimed to have been individually displayed. At most 64 actions remain pending; entries expire after five seconds, oldest entries are dropped at capacity, and teardown abandons outstanding entries. Reports count pending, expired, dropped, and abandoned actions.

## Reports and cleanup

Exit normally with Ctrl+C, or `q` outside an editor in the mock workspace/gallery. After terminal cleanup, Pond writes a matching `pond-<timestamp>-<uuid>.json` and `.txt` pair in `.profiles` under the launch working directory. Open the text file for an overview or the JSON for resource timelines, per-region React distributions, availability, and collection counters. The directory is gitignored in the checkout; files are not automatically deleted between sessions.

Reports include schema version, application/Bun/React/OpenTUI versions, OS/architecture, app or gallery source, terminal dimensions at the last resize, duration, and enabled instrumentation. The text summary includes package versions, enabled instrumentation, and per-region observed React commit counts with actual render durations and base render estimates in milliseconds. Regions without samples show unavailable durations. `nodeEnv` records the allowlisted environment value; it does **not** prove which React implementation was bundled. Use observed Profiler availability and the build command when comparing builds. Each region's `actualMs.count` is its observed commit callback count. Nested workspace and feature durations overlap and must not be summed.

Fresh directories use mode 0700 and files 0600 where supported; existing directory permissions are unchanged. Writes use unique temporary files and renames. Export gets at most another 1.5 seconds during shutdown, separately from terminal cleanup and log flushing. A write failure or timeout prints a fixed, safe message and preserves the application's exit status. Cleanup is best-effort: forced termination or storage failure can leave incomplete files or prevent a report. The final snapshot stops collection before serialization; very short sessions may have no one-second resource samples.

Diagnostics and CPU profiling are separate. `bun run profile:cpu` retains its existing behavior. Profiling adds work: frame callbacks, bounded aggregation, sampling, and React boundaries can affect the timings being measured. Compare the same scenario, terminal size, runtime/build mode, and instrumentation settings; repeat runs and inspect idle versus sustained resource samples. Reports do not measure executable/archive size—measure those artifacts separately during later build comparisons.

## React Profiler capability

On Linux x64 with Bun 1.4.2, React 19.3.1, and OpenTUI 0.6.8, the probe observed:

| Execution mode                                | Profiler callbacks                                   |
| --------------------------------------------- | ---------------------------------------------------- |
| Source, default development mode              | Mount and update                                     |
| Source with `NODE_ENV=production`             | None, despite confirmed commits and rendered updates |
| Compiled with Pond's current release flags    | Mount and update; bundled mode was development       |
| Same compilation plus explicit `--production` | None; bundled mode was production                    |

The last two results are significant: despite Bun 1.4.2's CLI help saying `--compile` implies production, the current command selected development React here. A separate build of the actual `src/app/bootstrap.tsx` with the same release flags and `--metafile` also listed `react.development.js` and `react-reconciler.development.js`. Setting `NODE_ENV=production` when running the already compiled development probe did not change its bundled mode.

Release flags are unchanged. Record the build command alongside reports and inspect collector availability; development and production results are not interchangeable. Absence of Profiler callbacks after confirmed commits means unavailable, not zero render duration. Never silently switch to development React to obtain production measurements. Profiler `actualDuration` and `baseDuration` are React render costs, not native frame/output durations; nested boundaries must not be summed as independent work.

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

## Implementation validation

Validated on Linux x64 with Bun 1.4.2, OpenTUI 0.6.8, and React 19.3.1:

- Diagnostics regression tests cover default-off collection, timing aggregation and units, action/frame correlation, bounded distributions/resource histories, native measurement availability, exclusion of arbitrary resource/environment fields, and repeated session timer/listener cleanup. Collector and session tests use the actual renderer; aggregation and interaction tests use controlled clocks and resource readings.
- PTY sessions exercised source app, component gallery, and a compiled executable with diagnostics both disabled and enabled: navigation, editor input/cancel, resizing, idle, normal/Ctrl+C exit, restored terminal state, and expected presence/absence of reports. Single-line app and multiline gallery editing were exercised.
- A separate compiled production check confirmed unavailable React Profiler callbacks while startup and correlated interaction measurements still work. Release flags were not changed.

A temporary headless comparison used three alternating disabled/enabled pairs at 100×30, each with 50 warm-up and 300 measured grid moves. Median key/commit/render-pass time ranged from 1.56–1.68 ms disabled and 1.60–1.63 ms enabled; p95 ranged from 1.90–2.27 ms disabled and 2.01–2.17 ms enabled. These overlapping ranges are a local sanity check, not a precise overhead estimate or performance guarantee. No benchmark harness or CI timing gate was added for this ticket.

macOS/Windows terminal behavior and physical display latency remain unverified by these checks.
