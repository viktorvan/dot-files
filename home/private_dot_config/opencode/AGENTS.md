Before creating, moving, or removing a worktree, MUST load the `worktrees` skill.

## Starting OpenCode sessions

- When starting OpenCode through a shell, including in Herdr panes or worktrees, use the `oc` alias.
- The alias sets required session permissions. Never invoke `opencode` directly to start a session.
- If `oc` is unavailable, report the blocker. Do not bypass it.
- This requirement does not apply to native subagent tool calls.
