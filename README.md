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
bun run start      # Run without watching
bun run typecheck  # Check TypeScript
bun run format     # Format with Prettier
bun run format:check # Check formatting
```

The scaffold contains a renderer entry point in `src/app/bootstrap.tsx` and a
welcome screen in `src/app/App.tsx`.

The setup follows the official [OpenTUI React documentation](https://opentui.com/docs/bindings/react/)
and [runtime requirements](https://opentui.com/docs/getting-started/runtime-support/).
