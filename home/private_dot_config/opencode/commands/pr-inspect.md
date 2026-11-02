---
description: Report what a PR changes, using the GitHub PR description and linked Linear issues as context
---

# PR inspection

Target: $ARGUMENTS

If the target is empty, use the current branch. Otherwise it can be a PR number, PR URL, or branch name.

## Current state

!`git branch --show-current 2>&1; git log --oneline origin/main..HEAD 2>&1 | head -50`

!`gh pr view --json number,title,url,state,baseRefName,headRefName,body 2>&1 || true`

## 1. Gather context

1. **Find the changes.**
   - If the target is a PR number or URL, use `gh pr view <target>` and `gh pr diff <target>`.
   - Otherwise, compare the branch against its base (default `origin/main`): `git diff origin/main...HEAD`. Also include uncommitted changes from `git status` and `git diff HEAD`.
2. **Read the GitHub PR description, if a PR exists.** The output above shows the PR for the current branch. If `gh` reports that no PR exists, the PR is local only. Continue without a description and say so in the report.
3. **Read the related Linear issues.** Look for issue IDs (for example `MED-1234`) in the branch name, the PR title and description, and the commit messages. Fetch each issue with the Linear tools. Read the description and the comments, and fetch parent issues when they give useful context. If you find no issue ID, say so in the report. Do not guess an issue.
4. **Read the full diff.** Open the changed files when the diff alone does not show what the change does.

Use the PR description and the Linear issues as context for the intent. The diff is the source of truth. If the code does something that the description or the issue does not mention, or does not do something that they say it does, list it under "Differences from stated intent".

## 2. Report

Read this PR and give me a report on exactly what it changes. List:

- Database schema changes (new tables, columns, indexes, migrations)
- Scheduled job / background worker changes
- A summary of every feature added or modified
- New external services, APIs, or third-party libraries
- New environment variables or config flags
- New public endpoints or interfaces
- Anything deleted or deprecated

Don't judge the code yet. Just tell me what it does.

Start the report with a short **Context** section: the PR (or "local branch, no GitHub PR yet"), the Linear issues you read, and a one-line summary of the intended change. End it with **Differences from stated intent** (write "None found" if there are none). For a category with no changes, write "None".
