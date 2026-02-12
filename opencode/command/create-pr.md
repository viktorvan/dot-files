---
description: Create and push PR with description
---

Create a pull request using the following steps:

1. Push the current branch to remote (use `git push -u origin HEAD`, ignore errors if branch already exists)
2. Create a draft PR using gh CLI with --draft flag, title based on the branch name and body: $ARGUMENTS

If $ARGUMENTS is a reference like "Use the description from above" or similar, look back in the conversation history to find the most recent PR description that was discussed or drafted.

After creating the PR, output only the PR URL.
