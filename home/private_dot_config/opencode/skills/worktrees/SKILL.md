---
name: Worktrees
description: Required before creating, moving, or removing worktrees. Use Worktrunk to manage checkouts and Herdr to open them.
---

# Worktrees

Use Worktrunk (`wt`) for worktree operations and path selection. If it fails, stop and report the problem.

## Create or open

1. For a new branch, run:
   ```sh
   wt switch --create '<branch>' --base '<base-ref>' --no-cd --format=json
   ```
   If no base was requested, omit `--base` to use Worktrunk's default branch.
2. For an existing branch, run `wt switch '<branch>' --no-cd --format=json`.
3. Read the checkout path from the result and verify its branch.
4. You MUST load Herdr's agent instructions, then open the checkout:
   ```sh
   herdr worktree open --path '<checkout-path>' --focus
   ```
    If Herdr returns `linked_worktree_source`, run `herdr workspace list`. Find the unique parent workspace with the same `worktree.repo_key` and `worktree.is_linked_worktree: false`, then retry:
    ```sh
    herdr worktree open --workspace '<parent-workspace-id>' --path '<checkout-path>' --focus
    ```
    This retry does not require user approval. Do not recreate the worktree or change the branch.
    If the parent workspace is missing or ambiguous, or the retry fails, stop and report the problem.
    Verify that the response identifies the requested checkout and a workspace ID. For other failures, stop and report the problem.
5. If work continues in the new checkout, start a new OpenCode session in the checkout's root pane, so that the workspace in Herdr matches the checkout the session works in. Use `root_pane.pane_id` from the `herdr worktree open` result:
   ```sh
   herdr pane run '<root-pane-id>' 'oc'
   ```
   If the new session starts a task, give it a handoff prompt with the task.
   Do not move the current session with `session_move` unless the user asks for it. A shell directory change does not move the session.
6. Report the branch, checkout path, and Herdr workspace ID.

Do not report completion until the checkout is open in Herdr and, if work continues there, an OpenCode session runs in the checkout's root pane.

## Move or remove

- Preview a move with `wt step relocate '<branch>' --dry-run`, then run it without `--dry-run`.
- Update Herdr and OpenCode paths after a move. Move active sessions outside a checkout before removal.
- Remove with `wt remove '<branch-or-path>' --no-delete-branch --foreground`. Delete the branch only if requested.
