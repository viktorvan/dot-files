
---
description: Review completed feature work for simplification, cleanup, test quality, and maintainability before PR or merge.
---

Review the current branch as a final cleanup and simplification pass after the feature is functionally complete.

Assume:
- the requested feature is already implemented
- the main behavior is working
- relevant tests are already written and passing

Your job is NOT to implement anything.
Your job is to look at the finished work holistically and identify what could still be improved before PR/merge.

Compare the current branch against `origin/main` and review the completed feature with these questions in mind:

1. Code shape
- Is any code now more complex than necessary?
- Are there abstractions, helper functions, wrappers, or intermediate types that can be removed or simplified?
- Is there duplication that became obvious only after the feature was completed?
- Are there awkward APIs or naming choices that should be cleaned up?

2. Tests
- Are any tests redundant, overly indirect, or testing unrealistic scenarios?
- Are any important tests missing?
- Could any tests be made clearer, smaller, or more representative of real behavior?
- Are there tests that are asserting implementation details instead of meaningful behavior?

3. Cleanup
- Is there dead code, obsolete paths, temporary scaffolding, or compatibility code that is no longer needed?
- Are there comments, logs, or temporary seams that should now be removed or tightened?
- Did the implementation introduce any small smells that are not bugs but should be cleaned up?

4. Design quality
- Now that the feature is complete, is the final abstraction boundary still the best one?
- Did we introduce a stepping-stone design that should be collapsed into a cleaner end-state?
- Is there a simpler version of the final solution that we can now see in hindsight?

5. Risk and maintainability
- Are there edge cases that are still untested?
- Are there correctness, performance, or maintenance risks that are not blockers but worth calling out?
- Is there anything likely to confuse future contributors?

Rules:
- Prefer simplification over adding more code
- Prefer deleting or collapsing code over introducing new abstractions
- Distinguish clearly between:
  - must-fix before merge
  - good improvements worth doing now
  - optional follow-up ideas
- Do not propose broad speculative rewrites unless the current solution is clearly awkward
- If the current implementation is already in good shape, say so plainly
- Reference files when making concrete suggestions

Output format:

1. `Overall assessment`
- 2-4 bullets on the overall quality of the finished feature

2. `Do now`
- only changes that are worth doing before merge

3. `Optional improvements`
- useful cleanup/refactor ideas, but not required

4. `Tests`
- redundant tests to remove
- missing tests to add
- tests that should be rewritten for clarity/realism

5. `Risks`
- non-blocking concerns or tradeoffs that remain

Be concise, specific, and pragmatic.

After the full review, close with a `## Suggested changes` section that consolidates every actionable suggestion into a flat checkbox list (`- [ ] ...`). Keep each item short — one line. This is the list I will copy back to you with the items I want implemented checked off (`- [x] ...`).
