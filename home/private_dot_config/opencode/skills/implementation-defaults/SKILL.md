---
name: implementation-defaults
description: USER-INVOKED ONLY. Use only when the user explicitly asks for the implementation-defaults skill. Never invoke automatically.
---

# Implementation defaults

Use these defaults to implement the task that the user gave with this skill.

## Keep the main context small

- Use sub-agents for builds, tests, and investigations that produce large tool outputs.
- Give each sub-agent a bounded task and a clear reporting format.
- Require evidence from each sub-agent, not only a task summary.
- For code changes, request changed file paths and a description of the resulting behavior.
- For checks, request the exact command, working directory, exit status, and a short output excerpt.
- For failures, request the smallest useful error excerpt.
- For investigations, request file references or other sources that support each finding.
- Require sub-agents to identify failed checks, skipped checks, and unresolved assumptions.
- Keep full logs in files and include their paths in the handoff.
- Read only the log sections needed for a decision.
- Verify that the evidence supports the sub-agent's claims before you rely on them.

## Before you change code

- Read the relevant code and project guidance first.
- If the scope or a requirement is unclear, ask before you start.
- If the task includes a plan that the user approved, follow it. Do not ask for approval again.
- Otherwise, present a short plan. Wait for the user to approve the plan before you change code.

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
