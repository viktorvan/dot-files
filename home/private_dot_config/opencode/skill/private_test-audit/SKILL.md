---
name: test-audit
description: Evaluates test value when planning, writing, or reviewing tests. Audits existing tests within the requested scope.
---

# Test audit

Prefer tests that detect credible failures in observable behavior.
Judge confidence and maintenance cost, not test counts or coverage percentages.

## Scope

- Follow project instructions and the user's testing constraints.
- Review the assigned changes. Do not expand a feature task into a repository-wide audit.
- Perform the work yourself. Do not delegate from this skill.
- An audit is read-only unless the task authorizes changes.
- Do not add maintained tests for Bash scripts unless requested.
- Temporary tests for verification are allowed.

## Before adding a test

Ask:

1. What observable behavior or independent contract does this protect?
2. What credible failure would make it fail?
3. Does existing coverage already detect that failure?
4. Can the test exercise the real behavior without production code added only for testing?

If the value is unclear, investigate or omit the test.
Do not print this checklist for every test.
Prefer extending an existing case when it protects the same behavior.
Add coverage at another layer only when that layer has a distinct failure risk.
Use representative inputs and independently derived expected results.
Where practical, confirm a regression test fails before the fix and passes afterward for the intended reason.
If that comparison is unavailable, state the verification limit.

## Question these patterns

- Assertions that repeat source text, imports, file lists, or declared flags.
- Expected values calculated by the function being tested.
- Mocks that implement the behavior the test claims to verify.
- Tests that only confirm a mock returned its configured response.
- Private helper or call-count checks that break after a behavior-preserving refactor.
- Duplicate scenarios already covered at a meaningful boundary.
- Tests with no meaningful assertion about the result.
- Failures caused by an unrelated guard, invalid setup, or an unreachable path.
- Production exports, wrappers, or flags used only to make tests possible.

These patterns identify candidates for investigation. They do not justify automatic deletion.

## Keep meaningful protection

- Keep tests for public contracts, persistence, migrations, security boundaries, and credible regressions.
- Keep ordering or exact-value checks when that detail is part of the observable contract.
- Keep source checks when they independently protect a real contract and survive unrelated refactoring.
- Do not remove a test merely because it is slow, static, old, or currently failing.
- Treat an unexplained failure as a possible product defect.

## Audit existing tests

1. Read the complete test, relevant production code, and overlapping tests.
2. Identify the behavior and failure the test can actually detect.
3. If its purpose is unclear, inspect relevant callers and history before judging it.
4. Before recommending removal, identify the remaining protection or explain why protection is unnecessary.
5. Confirm that the remaining protection runs in the relevant test job.
6. Recommend keep, rewrite, or remove, with concrete evidence.

If evidence is insufficient, keep the test and report the uncertainty.
Do not replace a low-value test with another test of the same implementation detail.
Remove test-only production code only within authorized scope and after checking its callers.
If a proposed change exceeds the assigned scope, report it to the caller instead of making it.

## Verify authorized changes

- Run the focused tests and any additional checks required by the project.
- Confirm retained tests still exercise the intended behavior.
- Report failures honestly. Do not delete failing tests to obtain a passing result.
- Do not commit, push, or create a PR from this skill.

## Report

Give the test location, recommended or completed action, reason, and remaining protection.
Include verification results and unresolved risks.
If no worthwhile changes are found, say so. Do not invent cleanup work.
