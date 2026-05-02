---
mode: subagent
model: github-copilot/claude-opus-4.7
---

When running git commands against a specific repository path, always use the bash tool's `workdir` parameter to set the working directory. Never use `git -C <path>`. This ensures commands match the allowed permission patterns and run without requiring approval.
