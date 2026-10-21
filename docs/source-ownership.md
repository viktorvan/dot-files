# Source ownership and capture notes

## Personal configuration: this repository

Source: the active `/home/viktor` environment. Not the previous GitHub dotfiles layout.

- `~/.config/opencode/opencode.json`, `cli.json`, and package/development configuration.
- Installed agents: captain, pilot, xo. The old committer, dotnet-builder, expert-coder, and general-gemini agents are removed.
- Personal commands, including `commands/quick-fix.md`, and thirteen prompt files. The old `supermemory-init` command is removed.
- The old `plugins/workmux-status.ts` plugin is removed.
- Personal skills: brainstorming, final-pass-review, medoma-frontend-refinement, medoma-platform, prompt-optimizer, receiving-feedback, simplified-technical-english, visual-planning, visual-task.
- The nine active scripts in `~/developer/utils`.

References to company repository names, API service names, or endpoint hostnames do not make these personally maintained files company-owned. They are retained. Credentials are not.

The commands `create-pr` and `self-review` contain optional Orbit references. They are personal utility commands, not copies of Orbit's agents or workflow skills.

## Installed Orbit configuration: this repository

- Agents: captain, pilot, xo.
- Skills: plot-trajectory, schedule-burn, test-audit.
- Orbit workflow rules/configuration on Linux only, with a templated database path.

The user requested that chezmoi track the installed definitions and Linux workflow configuration.
This replaces the previous policy that excluded Orbit configuration from chezmoi.
Orbit installation still belongs to provisioning. Its database and backups remain excluded.
The database path uses the destination home directory instead of a fixed `/home/viktor` path.
macOS Orbit configuration remains unmanaged.

Chezmoi directories are non-exact. Applying personal files does not delete unrelated local agents or application state.

## Project-owned files

API and Frontend `.opencode` content stays in those project repositories. Nothing was imported from either project's `.opencode` directory. This does not change ownership of personally written global skills that help work on those projects.

## Intentionally excluded

- Provider/GitHub authentication files, secret environment scripts, SSH keys, Azure tokens, and .NET user-secrets.
- AI histories, logs, databases, attachments, and shell snapshots.
- `node_modules`, caches, backup skill copies, and generated application state.
- The ASD-STE100 Issue 9 PDF. The skill's assets README explains how to obtain an authorized copy. Its scripts and references are included, but the licensed PDF is not redistributed.
- All Codex configuration, hooks, and generated `.system` skills. Codex sync is disabled on both platforms for now; existing local files remain unmanaged.
- OpenCode `service.json` contains a local service credential and remains unmanaged.
- The active OpenCode `package-lock.json` does not match the dependency-free manifest. Do not publish it as a reproducible installation claim.

## Preserved behavior and remaining compatibility checks

- Models, MCP endpoints, and permissions come from this machine's active OpenCode V2 configuration.
- CLI preferences come from `cli.json`, which replaces the old `tui.json`.
- The platform skill references an environment variable for Azure authentication. No actual knowledge-base content or credentials were retrieved.
- OpenCode defaults to `build`. The captured captain, pilot, and xo agents require the Orbit CLI when used.
- `mermaid_preview.sh` requires `mmdr` and selects macOS `open` or Linux `xdg-open` when available. Those remain external tool dependencies.
- Completion generation still requires the workmux and Orbit CLIs. Copying the script does not execute them.
- OpenCode uses the captured configuration only after its next restart. No live files were changed during this capture, so no restart is needed now.
