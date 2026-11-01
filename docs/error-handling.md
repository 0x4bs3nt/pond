# Error handling and local logs

Pond records application lifecycle events and unexpected failures locally without enabling performance diagnostics. Logs are not uploaded.

## Finding logs

From a source checkout, run:

```sh
bun run logs
bun run logs --follow
```

Commander handles command routing, option validation, and generated help. Use `bun run start --help`, `bun run start --version`, or `bun run logs --help` from the checkout; the executable equivalents are `pond --help`, `pond --version`, and `pond logs --help`. Help, version output, and rejected arguments do not initialize the TUI or its logger.

The packaged executable uses `pond logs` and `pond logs --follow` (or `-f`). These commands locate logs automatically and do not start the TUI or create their own log files. Plain `logs` prints the most recently modified process log and exits. Follow mode prints existing contents, streams additions, follows rotation and newer process logs, and waits if no logs exist yet. Press Ctrl+C to stop. Run it in a separate terminal while using Pond.

Log records go to stdout; directory information and errors go to stderr, so records can be piped to another tool. The command uses the same environment overrides as the app. It reads current `.jsonl` files, not historical `.1` backups; follow mode retains the old file handle long enough to read its remaining tail during rotation.

| Platform | Default directory                                                   |
| -------- | ------------------------------------------------------------------- |
| Linux    | `$XDG_STATE_HOME/pond/logs`, or `~/.local/state/pond/logs`          |
| macOS    | `~/Library/Logs/Pond`                                               |
| Windows  | `%LOCALAPPDATA%\Pond\logs`, or the user's `AppData\Local\Pond\logs` |

Set `POND_LOG_DIR` to an absolute directory to override the default. Relative overrides and relative `XDG_STATE_HOME` values are ignored. For example:

```sh
POND_LOG_DIR=/tmp/pond-logs bun run start
```

Each process writes `pond-<pid>.jsonl`, with one JSON object per line. Inspect it with a text editor or `tail`. A fatal exit prints the log path after terminal cleanup, or reports that logging failed.

Each file is capped at 256 KiB and rotates to one `.1` backup. Startup retains the newest eight files belonging to exited processes; active processes keep their own files. Each running process can therefore retain two files. On systems supporting Unix permissions, newly created log directories use `0700` (subject to umask) and files use `0600`. Existing directory permissions are left unchanged, including directories selected through `POND_LOG_DIR`.

The write queue holds at most 32 pending records. Overflow drops records rather than growing memory indefinitely; the next accepted record includes `droppedRecords`. Fatal and UI failures take priority over queued records. A failed write disables that logger for the remainder of the run. Shutdown waits a bounded time for queued writes and reports failure without recursively trying to log the logger error.

## What a record contains

Records contain a timestamp, severity, fixed event name, application and Bun versions, process ID, and an optional fixed operation source. Events include `app.started`, `app.stopped`, `ui.failed`, `app.fatal`, `runtime.error`, `runtime.warning`, and `shutdown.failed`.

Error details include a known error classification, an allowlisted OS error code when available, source filenames with line/column numbers, and up to two nested causes. Arbitrary error messages, thrown strings, custom properties, function names, and full source paths are omitted. This deliberately sacrifices message detail because driver errors can contain SQL, credentials, or cell values. Console errors and warnings are routed through the same safe channel; raw console arguments are not persisted.

Do not add credentials, connection strings, SQL parameters, cell contents, or raw keyboard input to log records. Source locations can still identify application code; inspect logs before sharing them. These logs are operational diagnostics, not a durable audit trail.

## Recovery and shutdown

Expected validation failures stay in the relevant UI. For example, invalid JSON stays in the editor so the user can fix or cancel it; it does not become a fatal log event or discard staged edits.

Unexpected React render failures replace the affected workspace with an exit screen. Workspace and pending-change stores are created outside that boundary, but the UI does not automatically remount or claim it is safe to continue. Press `q` or Ctrl+C to exit with a failure status.

Bootstrap failures, uncaught exceptions, unhandled rejections, and renderer/input failures use a single fatal shutdown path. OpenTUI may also report the same error through its console channel; object identity prevents duplicate reports. Cleanup is deferred out of rendering callbacks, waits up to 1.5 seconds for terminal closure, then waits up to 1.5 seconds for logs. Fatal exits use status 1; normal exits use status 0. If terminal cleanup fails or times out, shutdown still exits and terminal restoration is best-effort.

The app intercepts `console.error` before creating the React root because the installed OpenTUI React renderer uses that callback for caught render errors. Reporting is deferred one microtask so the application boundary can claim the error first. Unclaimed error objects are fatal; string-only console errors produce a generic log event. This integration should be rechecked when upgrading OpenTUI or React.

Error boundaries do not catch asynchronous work or event-handler errors. Future database operations should handle expected failures at their feature/service boundary, show a safe user-facing message, and retain pending changes where safe. Unexpected failures must reach the fatal handler rather than being swallowed.

Pending edits remain memory-only and do not survive process termination. Forced termination, native crashes, power loss, or a blocked JavaScript thread can prevent both cleanup and log flushing. Disk writes are not a crash-durable journal. Performance measurements remain a separate opt-in feature.

## Validation

Run `bun run check`. Logging tests inspect actual on-disk JSON records, ordering, safe error details, rotation, retention, queue limits, and failures. Lifecycle tests cover duplicate errors and bounded shutdown. The React boundary test exercises a real failed render and checks that external pending changes remain intact before exit.
