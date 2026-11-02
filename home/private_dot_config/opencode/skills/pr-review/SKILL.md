---
name: pr-review
description: Use when the user asks for a PR review or code review of a PR or branch, including a review in another agent such as xo. Judges correctness, risk, and fit with the PR description and Linear issues.
---

# PR review

## Running in another agent

If the user asks to run this review in another agent (for example xo), do not perform the review yourself. Start that
agent with the subagent tool. Its prompt must contain only:

- the target (PR number, URL, or branch), if one was given
- the focus area, if one was given
- the instruction to load the `pr-review` skill with the skill tool and follow it

Do not include your own summary of the change, your opinion of the implementation, or earlier findings. The other agent
must form its own view. Return its result to the user unchanged.

Do not edit files. Read any code you need to verify a finding before you report it. Do not report a finding you have
not checked against the actual code.

## Context

If a `/pr-inspect` report for this PR is already in the conversation, use it as your baseline, and also use the
Linear issues and PR description it refers to. Otherwise, gather the context yourself:

1. **Target**: a PR number, PR URL, or branch from the request. If there is none, use the current branch.
2. **Diff**: for a PR number or URL, use `gh pr view <target>` and `gh pr diff <target>`. Otherwise, use
   `git diff origin/main...HEAD`, and include uncommitted changes from `git status` and `git diff HEAD`.
3. **PR description**: `gh pr view --json title,body,url`. If no GitHub PR exists, the branch is local only. Say so and
   continue.
4. **Linear issues**: find issue IDs (for example `MED-1234`) in the branch name, the PR title and description, and the
   commit messages (`git log --oneline origin/main..HEAD`). Read each issue's description and comments with the Linear
   tools. If you find no issue, say so. Do not guess an issue.

The diff is the source of truth. The PR description and the Linear issues describe the intent.

## Evaluate

1. **Intent**: Does the change do what the Linear issue and PR description ask? Are acceptance criteria missed, or is
   there scope creep?
2. **Correctness**: Logic errors, unhandled edge cases, null and error paths, concurrency, time zones, off-by-one.
3. **Data and migrations**: Is each migration safe on existing data? Is it reversible? What about locking and backfills,
   and is the old code compatible during deploy?
4. **Jobs and workers**: Idempotency, retries, failure handling, scheduling overlap.
5. **Security and privacy**: Authorization on new endpoints, input validation, secrets, and logging of sensitive or
   patient data.
6. **Interfaces**: Breaking changes for callers or clients, versioning, and whether the API is consistent with existing
   endpoints.
7. **Tests**: Does the new behavior have tests that check real behavior? Which important cases are missing?
8. **Conventions**: If `CODING_STANDARDS.md` exists, check the diff against it. Follow existing patterns in the
   codebase.
9. **Operability**: Config defaults, feature flags, logging and metrics, rollout and rollback.

If the request names a focus area, examine it in more depth. Still report blocking issues in other areas.

## Output

1. **Verdict**: approve / approve with comments / request changes, plus 1–2 sentences on why.
2. **Blocking**: must fix before merge.
3. **Should fix**: real issues that don't block the merge.
4. **Nits**: optional and short.
5. **Questions for the author**: things you could not determine from the code or the issue.

For each finding, give `file:line`, what is wrong, why it matters, and a concrete suggestion. If a section is empty,
write "None". Do not pad.

Finish with `## Suggested review comments` as a flat checkbox list (`- [ ] file:line — comment`), one line each.
