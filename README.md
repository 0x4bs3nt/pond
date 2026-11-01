# Pond

A terminal database manager built with TypeScript, OpenTUI, and React.

## Development

Requires [Bun](https://bun.sh) 1.3.14 or later.

On Nix, enter the development shell to use the pinned Bun package:

```sh
nix develop path:.
```

With direnv and nix-direnv enabled in your shell, run `direnv allow` once instead.
The environment will load automatically when you enter this directory.
The `path:.` reference also works before the new flake files are tracked by Git.
Nix requires the `nix-command` and `flakes` experimental features to be enabled.

```sh
bun install
bun run dev
```

Press `q` outside an editor or `Ctrl+C` to quit. Development mode debounces source saves and waits for terminal cleanup before restarting. If a save introduces a startup error, it restores the terminal and waits for the next change so you can fix it without restarting the command.

```sh
bun run start        # Run without watching
bun run typecheck    # Check TypeScript
bun run lint         # Check boundaries and code rules in source and tooling
bun run test         # Test grid navigation and workspace rendering
bun run format       # Format with Prettier
bun run format:check # Check formatting
```

## Mock workspace

Pond currently opens a mock workspace with an explorer, mock-table tabs, a grid, and a selected-value preview. Cell edits are staged locally; no database connection is needed. The demo includes 250 members, 120 events, and an empty audit log, with NULLs, empty text, Unicode, long values, and JSON.

| Control                                   | Action                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Arrow keys                                | Move between grid cells, or select a table when the explorer has focus |
| Tab / Shift+Tab                           | Cycle focus through grid, explorer, and tabs; Shift+Tab reverses       |
| Enter in the explorer                     | Open the selected table                                                |
| ← / →, Home / End in tabs                 | Activate the previous/next or first/last open tab                      |
| Enter in tabs                             | Focus the active table grid                                            |
| Delete in tabs / Ctrl+W outside an editor | Close the active tab if it has no pending edits                        |
| Click a tab / ×                           | Activate / close that tab                                              |
| Click < / > in the tab bar                | Reveal and activate a hidden tab                                       |
| Enter in the grid                         | Edit the selected cell                                                 |
| Enter in a single-line editor             | Stage the value                                                        |
| Enter in a multiline/JSON editor          | Insert a newline                                                       |
| Ctrl+S in an editor                       | Stage the value                                                        |
| Escape in an editor                       | Cancel the current draft                                               |
| Ctrl+N in an editor                       | Stage SQL NULL                                                         |
| Ctrl+D in the grid                        | Discard all pending changes in the current table                       |
| Click                                     | Open a table or select a cell                                          |
| Page Up / Page Down                       | Move by one viewport of rows                                           |
| Home / End                                | Move to the first / last column                                        |
| Ctrl+Home / Ctrl+End                      | Move to the first / last row                                           |
| Mouse wheel                               | Scroll rows                                                            |
| Shift+wheel or horizontal wheel           | Scroll columns horizontally                                            |
| q outside an editor / Ctrl+C              | Quit                                                                   |

Use a terminal at least 60 columns wide and 16 rows high. Column headers remain fixed while scrolling vertically. The grid mounts only visible rows and columns. Switching tables resets selection and scroll position for now, but preserves staged edits for each table.

Opening a table again activates its existing tab. The tab bar keeps the active tab visible as the terminal resizes. Tabs with staged edits show `*`; attempting to close one focuses its grid and keeps it open. Use `Ctrl+D` to explicitly discard its edits, then close it. Closing the last tab returns focus to the explorer so another table can be opened.

Changed cells have a `*` marker and amber text. Original mock values remain unchanged; staging the original value removes the pending change. Text and JSON columns open an expanded editor. Invalid JSON stays open with an error, and valid JSON is preserved exactly as entered. An untouched NULL remains NULL; typing and clearing the field stages empty text instead.

While an editor is open, it owns keyboard focus: `q` types text, Tab does not switch panels, and clicks cannot switch tables or select another grid cell. Shrinking below the minimum terminal size cancels the open draft while preserving previously staged edits. Pending changes live only for the current app session and are lost on quit or development restart. Applying changes to PostgreSQL is future work.

The reusable grid lives in `src/components/data-grid`; mock data and table presentation live in `src/features/table-browser`. App startup and workspace composition live in `src/app`.

Shared workspace state uses Zustand: `src/state/workspace` owns open tab IDs, the active table ID, and panel focus, while `src/features/workspace` provides React subscriptions. Each app instance creates its own store. Explorer highlighting and grid selection/scrolling remain local; reusable components receive props rather than importing stores.

`src/state/table-sessions` owns a separate pending-change buffer keyed by table, row, and column identity. The table-browser feature overlays those changes on fetched mock rows and passes display values and decorations to the grid. Editor drafts remain local until confirmed.

The setup follows the official [OpenTUI React documentation](https://opentui.com/docs/bindings/react/)
and [runtime requirements](https://opentui.com/docs/getting-started/runtime-support/).

## Component gallery

Run `bun run gallery` to exercise grids and editors independently with mock props. Use `--list` for scenarios or `--scenario json --theme light` for a specific preview. See [the gallery guide](docs/component-gallery.md) for controls and validation scenarios.

Use `bun run gallery:bench` for repeatable headless grid measurements. Large-data scenarios and current findings are documented in [grid responsiveness validation](docs/grid-performance.md).

## Releases

Development happens on `dev`. Stable releases are prepared on `dev → main` PRs and published after the squash merge passes CI. Versions start at `0.1.0`; there are no nightly releases. See [the release workflow](CONTRIBUTING.md#stable-releases). Releases currently provide source code and release notes, not packaged executables.

See [building and packaging](docs/packaging.md) for native executable builds, platform validation, and release artifacts.
