# Contributing Guide

## Development Setup
1. Ensure Node.js 20+ and pnpm are installed.
2. Run `pnpm install` in the root directory.
3. Run `pnpm dev` to start both frontend and backend.

## Branch Naming
- `feature/<name>` for new features
- `fix/<name>` for bug fixes
- `docs/<name>` for documentation changes

## Commit Format
We use conventional commits:
- `feat: <description>`
- `fix: <description>`
- `docs: <description>`
- `chore: <description>`

## Pull Request Process
1. Create a branch from `main`.
2. Ensure `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
3. Open a PR with a clear description of changes.
