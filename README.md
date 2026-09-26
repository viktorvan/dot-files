# Dotfiles managed with chezmoi

The previous repository is preserved on branch `legacy` at commit `70bad94f56e378db68381774a4f9795cb6866901`. The new source state is under `home/`, selected by `.chezmoiroot`.

This is an initial migration of reviewed active server configuration. It has not been applied to the live home directory. macOS-specific desktop configuration remains on legacy until deliberately imported.

## Preview first

```sh
chezmoi --source "$PWD" diff
chezmoi --source "$PWD" --dry-run apply
```

Apply only after reviewing the changes. Do not automatically apply on daily server startup: local configuration edits must survive VM recreation.

The source follows chezmoi naming conventions (`dot_`, `private_`, and `executable_`). Do not hand-copy those encoded names into your home directory.

## Scope

Initial import includes Zsh/Zim configuration, tmux, Git, Neovim, workmux, Yazi, bat, Lazygit, and GitHub CLI/dashboard preferences. Existing Neovim plugin versions remain in `lazy-lock.json`.

Tool installation belongs to the private `viktorvan/dev-server-provisioning` repository. This repo does not run installers or start services during apply.

SSH keys, GitHub OAuth state, provider credentials, application databases, histories, caches, plugin checkouts, and node_modules are not imported. Shell references to manually restored credentials are conditional.

OpenCode agents/skills, Orbit configuration, Codex hooks, workflow scripts, and T3 service configuration require a separate reviewed import. Do not copy entire application directories into this public repository.

## Portability

- Neovim is EDITOR/VISUAL. System-level vi/vim compatibility will be provided by server provisioning.
- Shell integrations are guarded when a tool is not installed.
- Linux and macOS Brew locations are detected without requiring Brew as the future installer.
- Remote clipboard configuration remains OSC52-based.
- The macOS-only debugger/1Password integrations are enabled only on macOS.
- Existing tmux and Neovim helpers still refer to `~/developer/utils`. Those scripts must be available before using the associated key bindings.

## Review before publishing

Check that the public source contains no credential values, private documents, local histories, or application state. The legacy branch preserves previous content but is not a substitute for reviewing newly imported files.

## Validation

```sh
CHEZMOI="$(command -v chezmoi)" python3 -m unittest discover -s tests -v
```

The apply test creates an isolated temporary home and state database, applies twice, and verifies that unmanaged authentication files are left alone. It does not load Neovim, Zsh plugins, or tmux plugins. Missing chezmoi or Zsh causes the corresponding tests to be skipped, not treated as validated.
