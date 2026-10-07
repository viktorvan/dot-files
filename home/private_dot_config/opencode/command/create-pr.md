---
description: Create and push PR with description
---

Create a pull request using the following steps:

1. Push the current branch to remote (use `git push -u origin HEAD`, ignore errors if branch already exists)
2. Create a draft PR using gh CLI with --draft flag, title based on the branch name and body: $ARGUMENTS

If you are working on a linear issue or orbit, use the id, e.g. MED-1234 as a prefix to the PR title.

If $ARGUMENTS is a reference like "Use the description from above" or similar, look back in the conversation history to find the most recent PR description that was discussed or drafted.

Do NOT include number of tests run, or that tests are passing in the PR description. That should be a given and not need be mentioned.

After creating the PR, output only the PR URL.
