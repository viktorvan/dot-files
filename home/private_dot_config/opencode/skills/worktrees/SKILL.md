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
   Verify that the response identifies the requested checkout and a workspace ID. If this fails, stop and report the problem.
5. If continuing there, move the OpenCode session with `session_move`. A shell directory change does not move the session.
6. Report the branch and checkout path.

Do not report completion until the checkout is open in Herdr and, if continuing there, the OpenCode session uses that checkout.

## Move or remove

- Preview a move with `wt step relocate '<branch>' --dry-run`, then run it without `--dry-run`.
- Update Herdr and OpenCode paths after a move. Move active sessions outside a checkout before removal.
- Remove with `wt remove '<branch-or-path>' --no-delete-branch --foreground`. Delete the branch only if requested.
