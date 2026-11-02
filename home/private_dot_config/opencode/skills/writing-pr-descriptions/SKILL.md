---
name: writing-pr-descriptions
description: Load before drafting, creating, or updating any pull request (PR) description. Keep descriptions short, with no verification details or Linear issue links.
---

# PR descriptions

Use the `markdown-writing` skill before writing the description.

- Explain what changed and why.
- Use one short paragraph or a few concise bullets.
- Include only information that helps reviewers understand the change.
- Include migration steps or breaking changes only when relevant.
- Omit headings unless they improve clarity. Do not use a fixed template.
- Do not include verification, testing, validation, or checklist sections.
- Do not include test results, pass counts, commands run, build status, or lint results.
- Do not mention checks such as `git diff --check`.
- Do not include Linear issue links or a related-issues section. The integration adds the Linear issue automatically.
- Describe the change, not the agent's work process.

These rules govern the PR description, not whether to run checks or tests.
