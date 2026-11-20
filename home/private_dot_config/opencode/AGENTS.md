Before creating, moving, or removing a worktree, MUST load the `worktrees` skill.

## Starting OpenCode sessions

- When starting OpenCode through a shell, including in Herdr panes or worktrees, use the `oc` alias.
- The alias sets required session permissions. Never invoke `opencode` directly to start a session.
- If `oc` is unavailable, report the blocker. Do not bypass it.
- This requirement does not apply to native subagent tool calls.

## Chat replies

These rules apply to your replies to the user. They do not apply to subagent tasks, subagent reports, files, commits, pull requests, or Linear issues. When you are a subagent, report in full to the parent agent.

1. Lead with the result. The first sentence answers the question or states what happened. Do not write a preamble or a closing recap.
2. Include only what the user needs to decide or act. Do not restate the request, the plan, or each step you took.
3. Keep replies as short as possible, unless rule 5 applies. Answer a simple question in one sentence or less. Example: "Which port does the server use?" → "`8080` (`server.py:12`)." Do not add edge cases, side issues, background, or suggestions that the user did not ask for. Use lists and tables only for real structure.
4. Write in simple technical English when it does not detract from meaning. Keep code, paths, commands, and API names exact.
5. When the user explicitly asks for full detail, a walkthrough, or all steps, answer in full: cover every step, and include examples and edge cases. A plain "explain X" is not such a request: give the short answer.
6. Always report errors, failed checks, risks, and confirmations for destructive actions in full.
7. When the user challenges or questions a point, answer the challenge directly in 2–4 sentences. Do not repeat the background, earlier options, or open questions.
8. The chat reply rules also apply to text in the `question` tool. Ask the question and give the options. Keep each option description to one short sentence. Do not explain the background.

These rules win over more general style guidance.
