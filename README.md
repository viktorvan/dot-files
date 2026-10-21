# Dotfiles managed with chezmoi

The previous repository is preserved on branch `legacy` at commit `70bad94f56e378db68381774a4f9795cb6866901`. The new source state is under `home/`, selected by `.chezmoiroot`.

This source supports Linux and macOS. macOS-specific desktop configuration remains on legacy until deliberately imported.

## Preview first

```sh
chezmoi --source "$PWD" diff
chezmoi --source "$PWD" --dry-run apply
```

Apply only after reviewing the changes. Do not automatically apply on daily server startup: local configuration edits must survive VM recreation.

The source follows chezmoi naming conventions (`dot_`, `private_`, and `executable_`). Do not hand-copy those encoded names into your home directory.
The `private_dot_config`, `private_gh`, and macOS `private_Library` directory attributes preserve private permissions on existing configuration directories.

## Scope

The import includes Zsh/Zim configuration, tmux, Git, Neovim, workmux, Yazi, bat, Lazygit, and GitHub CLI/dashboard preferences. Existing Neovim plugin versions remain in `lazy-lock.json`.

The current capture includes OpenCode V2 configuration, installed agents and skills, commands, prompts, and nine active `~/developer/utils` scripts.
These files come from the active server, not legacy.
The old personal agents, workmux plugin, and `tui.json` are no longer included.

Tool installation belongs to the private `viktorvan/dev-server-provisioning` repository. This repo does not run installers or start services during apply.

SSH keys, GitHub OAuth state, provider credentials, application databases, histories, caches, plugin checkouts, and node_modules are not imported. Shell references to manually restored credentials are conditional.

Chezmoi now manages the installed Orbit agents and workflow skills as personal configuration.
It also manages `~/.config/orbit/config.toml` on Linux only, with a database path based on the destination home directory.
Orbit installation remains a provisioning task. API and Frontend own their project-local skills.

The current OpenCode default agent is `build`. The source preserves the active models, permissions, and MCP configuration.
OpenCode service credentials and the stale package lock remain excluded.

T3 service definitions belong to server provisioning. Authentication and runtime databases remain on the persistent disk. See [source ownership and capture notes](docs/source-ownership.md).

## Portability

- Neovim is EDITOR/VISUAL. System-level vi/vim compatibility will be provided by server provisioning.
- Shell integrations are guarded when a tool is not installed.
- Linux and macOS Brew locations are detected without requiring Brew as the future installer.
- Linux Neovim clipboard configuration remains OSC52-based. macOS uses the native clipboard provider.
- The macOS ARM64 debugger integration is enabled only on that platform. Supermaven, CodeCompanion, scratch.nvim, Zen Mode, nvim-cmp, and the Neovim 1Password integration are retired; Blink remains the completion engine.
- tmux PATH, Herdr, Lazygit, and newer btop options are platform-specific. Both platforms show CPU, memory, and processes in btop.
- macOS Lazygit configuration is managed in `~/Library/Application Support/lazygit`. Linux uses `~/.config/lazygit`.
- The shared shell uses Zim. `~/.config/zsh/macos.zsh` preserves Mac tooling paths and local shortcuts.
- Existing tmux and Neovim helpers refer to `~/developer/utils`. Those scripts are now managed here, but their external tools remain provisioning dependencies.
- Codex configuration and hooks are not managed on either platform. Existing local files are preserved. They can be re-added from Git history when needed.
- The scratch-file helper uses the current user's data directory instead of a hardcoded macOS home.

## Review before publishing

Check that the public source contains no credential values, private documents, local histories, or application state. The legacy branch preserves previous content but is not a substitute for reviewing newly imported files.

## Validation

```sh
CHEZMOI="$(command -v chezmoi)" python3 -m unittest discover -s tests -v
```

The apply tests use isolated temporary homes and state databases. They check Linux and macOS templates, including Linux-only Orbit configuration.
Repeated apply preserves unmanaged authentication, local agents, and Codex configuration/hooks.
The tests do not load OpenCode, Neovim, or shell/tmux plugins.
Missing chezmoi or Zsh causes the corresponding tests to be skipped, not treated as validated.
