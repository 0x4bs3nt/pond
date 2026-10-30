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

Press `q` or `Ctrl+C` to quit. Development mode restarts on source changes.

```sh
bun run start        # Run without watching
bun run typecheck    # Check TypeScript
bun run lint         # Check boundaries and code rules in source and tooling
bun run test         # Test grid navigation and workspace rendering
bun run format       # Format with Prettier
bun run format:check # Check formatting
```

## Mock workspace

Pond currently opens a read-only mock workspace with an explorer, one active table tab, a grid, and a selected-value preview. No database connection is needed. The demo includes 250 members, 120 events, and an empty audit log, with NULLs, empty text, Unicode, long values, and JSON.

| Control                         | Action                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| Arrow keys                      | Move between grid cells, or select a table when the explorer has focus |
| Tab / Shift+Tab                 | Switch focus between the grid and explorer                             |
| Enter in the explorer           | Open the selected table                                                |
| Click                           | Open a table or select a cell                                          |
| Page Up / Page Down             | Move by one viewport of rows                                           |
| Home / End                      | Move to the first / last column                                        |
| Ctrl+Home / Ctrl+End            | Move to the first / last row                                           |
| Mouse wheel                     | Scroll rows                                                            |
| Shift+wheel or horizontal wheel | Scroll columns horizontally                                            |
| q / Ctrl+C                      | Quit                                                                   |

Use a terminal at least 60 columns wide and 16 rows high. Column headers remain fixed while scrolling vertically. The grid mounts only visible rows and columns. Switching tables resets selection and scroll position for now; editing and real database connections are future work.

The reusable grid lives in `src/components/data-grid`; mock data and table presentation live in `src/features/table-browser`. App startup and workspace composition live in `src/app`.

Shared workspace state uses Zustand: `src/state/workspace` owns the active table ID and panel focus, while `src/features/workspace` provides React subscriptions. Each app instance creates its own store. Explorer highlighting and grid selection/scrolling remain local; reusable components receive props rather than importing stores.

The setup follows the official [OpenTUI React documentation](https://opentui.com/docs/bindings/react/)
and [runtime requirements](https://opentui.com/docs/getting-started/runtime-support/).
