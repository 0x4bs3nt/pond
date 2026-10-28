# Contributing to Pond

Pond is in early development. For larger changes, open an issue first to discuss the scope. Bug fixes and focused improvements are welcome as pull requests.

## Set up your environment

Install Bun 1.3.14 or later. If you use Nix, run `nix develop path:.` from the repository root. With direnv and nix-direnv configured, you can use `direnv allow` instead.

Fork the repository, clone your fork, and create a feature branch from the latest upstream `dev` branch:

```sh
git clone https://github.com/YOUR_USERNAME/pond.git
cd pond
git remote add upstream https://github.com/0x4bs3nt/pond.git
git fetch upstream
git switch -c feat/your-change upstream/dev
bun install --frozen-lockfile
bun run dev
```

Press `q` or `Ctrl+C` to quit. Use `bun run start` to run without watching for source changes.

## Check your changes

Run these commands before submitting a pull request:

```sh
bun run format
bun run typecheck
bun run format:check
```

CI installs dependencies with `bun install --frozen-lockfile` and runs the TypeScript and formatting checks. When changing dependencies, use Bun and commit the updated `package.json` and `bun.lock` together.

For interface changes, also run the app and describe the interactions you checked. Include screenshots or a recording when useful. Add focused tests when introducing behavior that can be meaningfully tested.

## Submit a pull request

Target `dev` and keep each pull request focused on one change. Describe the problem, what changed, and how you tested it. Link any related issue and mention known limitations.

Use a Conventional Commit title, such as:

- `feat: add table navigation`
- `fix: restore focus after closing an editor`
- `docs: clarify development setup`
- `chore: update dependencies`
- `ci: add formatting checks`

An optional scope is welcome, for example `feat(grid): add column selection`. Feature pull requests are squash merged, so their titles become commit messages. Keep your branch up to date with `dev` when GitHub requests it.

## Report bugs and vulnerabilities

Use the bug-report template for ordinary bugs. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) and report privately.
