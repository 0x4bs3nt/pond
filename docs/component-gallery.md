# Component gallery

Run Pond's reusable grid and editors independently of the workspace and database workflows:

```sh
bun run gallery
bun run gallery --list
bun run gallery --scenario json
bun run gallery --scenario pending --theme light
bun run gallery --scenario values --theme contrast
```

`--help` lists accepted options. Help, scenario listing, and invalid arguments do not start the terminal UI. The gallery imports public component APIs and supplies mock props with local React state; it does not load workspace stores, database connections, or saved preferences.

## Scenarios

| ID            | What to exercise                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `wide`        | 250 rows and 24 columns, selection, paging, horizontal/vertical scrolling, fixed headers, and resizing.              |
| `empty`       | Column headers with zero rows; navigation and Enter remain safe.                                                     |
| `values`      | NULL versus empty text, CJK, Arabic, emoji, combining marks, multiline/long values, and exact numeric text.          |
| `pending`     | Changed-cell decorations against selected and unselected backgrounds. Includes deliberately decorated fixture cells. |
| `single-line` | Input editing, confirm/cancel, empty text, and staging NULL.                                                         |
| `multiline`   | Newlines, mouse selection, confirm/cancel, and resizing an open editor.                                              |
| `json`        | Invalid-JSON feedback and preservation of whitespace and large numeric literals.                                     |

Additional stress scenarios added for #14: `stress` (100,000 rows × 256 columns) and `long-values` (1,000 rows × 32 columns with 65,536-unit cell values). See [grid performance](grid-performance.md) for repeatable measurements and validation results.

## Controls

- `F5` / `F6`, or click **Previous** / **Next**, to change scenarios. Each visit starts from its fixture.
- `r`, or click **Reset**, to reset the current scenario, selection, and viewport.
- Grid arrows, Page Up/Down, Home/End, mouse clicks, and wheel scrolling behave as in Pond. `Enter` opens the selected cell's editor.
- In editor scenarios, press `Enter` or click **Open editor**.
- `Enter` stages single-line input; multiline/JSON editors use `Ctrl+S`. `Ctrl+N` stages NULL. `Escape` cancels.
- `Ctrl+D` restores fixture values and decorations. The `pending` fixture intentionally starts decorated, so those initial markers remain after reset.
- `q` outside an editor or `Ctrl+C` exits.

While an editor is open, scenario navigation and reset are blocked for both keyboard and mouse. Typing `q` edits text rather than quitting. Staged values and decorations are gallery-local; they are not a second implementation of Pond's pending-change store.

Use at least 60 columns × 18 rows. Resize the terminal during navigation and editing. Below the minimum size, the preview is clipped and a resize notice appears; the scenario stays mounted so the current editor draft survives. All gallery state disappears on exit.

## Theme previews

`--theme default` uses Pond's current tokens. `light` and `contrast` are development preview palettes, not installed application themes or preference settings. The selected palette replaces tokens once before rendering in the standalone gallery process. It is never saved and does not affect another running Pond process.

Compare NULL/empty text, selection, pending decorations, borders, and editor feedback in each palette. Relaunch with a different `--theme` to change palettes.

## Validation and extension

Use the gallery for manual UI validation, especially narrow/wide terminals, Unicode alignment, mouse selection, editor focus, and errors. For headless response-time, node-count, and memory observations, run `bun run gallery:bench`; see [the validation report](grid-performance.md). Use `POND_DIAGNOSTICS=1 bun run gallery` to collect startup, grid/editor interaction, rendering, and resource measurements into `.profiles` on exit; see [runtime diagnostics](runtime-diagnostics.md). The interactive gallery itself is not a benchmark. Avoid routine snapshot tests merely to cover gallery scenarios.

Add scenario definitions and mock props to `tools/component-gallery/scenarios.ts`, with contracts in `types.ts`. Keep fixtures independent of application features and stores. Import components through their public `index.ts` APIs. The gallery reuses Pond's error boundary, terminal lifecycle, and sanitized local logger; unexpected failures can be inspected with `bun run logs`.
