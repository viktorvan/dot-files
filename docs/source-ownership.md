# Source ownership and capture notes

## Personal configuration: this repository

Source: the active `/home/viktor` environment. Not the previous GitHub dotfiles layout.

- `~/.config/opencode/opencode.json`, `tui.json`, and package/development configuration.
- Personal agents: committer, dotnet-builder, expert-coder, general-gemini.
- All eight personal commands and thirteen prompt files.
- `plugins/workmux-status.ts`.
- Personal skills: brainstorming, final-pass-review, medoma-frontend-refinement, medoma-platform, prompt-optimizer, receiving-feedback, simplified-technical-english, visual-planning, visual-task.
- `~/.codex/config.toml` and `hooks.json`.
- The nine active scripts in `~/developer/utils`.

References to company repository names, API service names, or endpoint hostnames do not make these personally maintained files company-owned. They are retained. Credentials are not.

The commands `create-pr` and `self-review` contain optional Orbit references. They are personal utility commands, not copies of Orbit's agents or workflow skills.

## Orbit-owned configuration: viktorvan/orbit

- Agents: captain, pilot, pilot-gemini, xo.
- Skills: plot-trajectory, schedule-burn, test-audit.
- Orbit workflow rules/configuration.

The installer is `scripts/install-opencode.sh` in the Orbit repository. It copies the versioned files from `agent-and-rule-updates` to a selected OpenCode configuration directory. It defaults to inspection, requires `--apply` to copy, and backs up conflicts only when explicit overwrite is requested.

Example, after checking out the chosen Orbit revision:

```sh
bash /path/to/orbit/scripts/install-opencode.sh --destination "$HOME/.config/opencode"
bash /path/to/orbit/scripts/install-opencode.sh --destination "$HOME/.config/opencode" --apply
```

This installer is a new local change at the time of capture. Provisioning must pin a published Orbit revision containing it before relying on the command. The workflow rules and machine-specific Orbit database path require explicit setup separately.

ChezMoi directories are non-exact. Applying personal files does not delete Orbit-installed files or unrelated application state.

## Project-owned files

API and Frontend `.opencode` content stays in those project repositories. Nothing was imported from either project's `.opencode` directory. This does not change ownership of personally written global skills that help work on those projects.

## Intentionally excluded

- Provider/GitHub authentication files, secret environment scripts, SSH keys, Azure tokens, and .NET user-secrets.
- AI histories, logs, databases, attachments, and shell snapshots.
- `node_modules`, caches, backup skill copies, and generated application state.
- The ASD-STE100 Issue 9 PDF. The skill's assets README explains how to obtain an authorized copy. Its scripts and references are included, but the licensed PDF is not redistributed.
- Codex's generated `.system` skills. They belong to the tool installation, not personal dotfiles.
- The active OpenCode `package-lock.json`: it does not match `package.json`. The manifest requests `@opencode-ai/plugin` 1.4.3; the stale lock records 1.14.33 and unrelated older dependencies. Do not publish that lock as a reproducible installation claim.

## Preserved behavior and remaining compatibility checks

- Models, MCP endpoints, permissions, and the OpenCode plugin's existing `@latest` declaration are captured without changing policy. Pinning runtime dependencies is a provisioning task, not a silent configuration change.
- The platform skill references an environment variable for Azure authentication. No actual knowledge-base content or credentials were retrieved.
- The OpenCode config depends on the separately installed captain agent. Do not declare a fresh environment ready until Orbit definitions are installed.
- Codex hooks invoke workmux. Workmux must be installed; no hooks are executed by chezmoi.
- `mermaid_preview.sh` requires `mmdr` and selects macOS `open` or Linux `xdg-open` when available. Those remain external tool dependencies.
- Completion generation still requires the workmux and Orbit CLIs. Copying the script does not execute them.
- OpenCode uses the captured configuration only after its next restart. No live files were changed during this capture, so no restart is needed now.
