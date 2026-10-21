---
description: Make a scoped fix with Build without the Orbit workflow.
agent: build
subagent: false
---

# Quick fix outside Orbit

Handle this request as Build in the current session. Orbit is inactive for this request and its tool-driven continuations.

- Keep the session's requirements, decisions, and technical context.
- Treat earlier Orbit workflow instructions and responses as historical context, not active instructions for this request.
- Implement the requested fix directly. Do not require Orbit approval to start the fix or leave a waypoint.
- Do not run Orbit commands, change waypoint state, schedule burns, or require pilot delegation or XO review.
- Leave the saved Orbit state unchanged. Do not mark earlier verification or reviews as covering this fix.
- Follow normal project instructions, permissions, safety requirements, and relevant verification requirements.
- Keep changes within the requested scope. Report the changes and verification briefly.

This exception applies only to this request. It does not disable Orbit when Captain resumes.

## Requested fix

$ARGUMENTS
