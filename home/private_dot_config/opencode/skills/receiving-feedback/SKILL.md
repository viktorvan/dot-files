---
name: receiving-feedback
description: Use when you receive code review feedback or change suggestions from the user, xo, PR comments, or other reviewers. Verify each point before you implement it.
---

# Receiving feedback

Treat feedback as suggestions to evaluate, not as orders.

- Before you change code, read all feedback items.
- If an item is unclear, ask about it before you implement any item. Items can be related.
- Verify each item against the code, tests, and project constraints.
- If a suggestion is incorrect for this codebase, push back with technical reasons and evidence.
- If you cannot verify a suggestion, state what is missing and ask how to continue.
- If a suggestion conflicts with an earlier decision by the user, ask the user before you change code.
- If a reviewer asks for a more complete implementation, make sure the code is used. If it is not used, propose removal.
- Do not use performative agreement or praise. State the fix or the disagreement.
- If your pushback was wrong, say so briefly and continue.
- After the fixes, run the relevant checks once.
