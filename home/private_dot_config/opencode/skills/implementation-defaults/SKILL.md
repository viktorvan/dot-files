---
name: implementation-defaults
description: USER-INVOKED ONLY. Use only when the user explicitly asks for the implementation-defaults skill. Never invoke automatically.
---

# Implementation defaults

Use these defaults to implement the task that the user gave with this skill.

## Before you change code

- Read the relevant code and project guidance first.
- If the scope or a requirement is unclear, ask before you start.
- Present a short plan. Wait for the user to approve the plan before you change code.

## While you implement

- Keep changes inside the approved scope.
- Write or update tests with behavior changes. Follow the project testing guidance.
- For significant test changes, use `test-audit`.
- If findings change the plan, adjust the plan and continue. Ask only if the change alters the requested result.
- When a coherent part of the work is complete and its checks pass, commit it. Stage only relevant files.

## Before you report

- Review your diff for scope creep, debug leftovers, and missed cases.
- Run the project's relevant checks.
- Do not report the task as done while required checks fail. Report failures with evidence.
- Report plan changes that you made during the work.
- Do not push or create a PR unless the user asks.
