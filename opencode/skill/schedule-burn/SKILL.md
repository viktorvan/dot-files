---
name: schedule-burn
description: Create a visual implementation plan with mermaid when delegating a single burn to a sub-agent. Includes decision diamonds with exit ramps for early abort when unexpected issues arise. The sub-agent does not know about orbit - use implementation language only.
---

GOAL
Create a Mermaid flowchart implementation plan for delegating a single burn to a sub-agent. The plan must include clear decision points with "exit ramps" - paths where the sub-agent should STOP and report back to the captain rather than attempting to solve unexpected issues on its own.

IMPORTANT: The sub-agent (expert-coder) does NOT know about orbit, waypoints, or burns. Your diagram must use plain implementation language only. Describe what to do, not which burn it is.

WHEN TO USE
- Before delegating a burn to expert-coder or other sub-agents
- For any burn that has potential failure modes or requires specific conditions to be met
- When you want the sub-agent to abort early if assumptions don't hold

SCOPE CHECK - BEFORE BUILDING THE DIAGRAM

This diagram represents ONE burn = ONE delegation to ONE sub-agent.
Each burn should address a single concern with 3-8 action steps.

Before building the diagram, check: does the burn combine independent concerns?
Examples of independent concerns:
- Core logic changes vs call-site updates
- Production code vs test updates
- Different modules that don't depend on each other's changes
- Validation logic vs API endpoints that use it

If yes, STOP. This burn should have been split into multiple burns during trajectory planning. Go back and adjust the trajectory.

A burn CAN touch many files if the change is mechanical and uniform
(e.g., updating a type signature propagated across 50 call sites).
The key question: does it require making independent design decisions
about separate concerns? If yes, split it.

MERMAID SYNTAX

```mermaid
flowchart TD
    Start[Start: Brief description of what to implement] --> Step1[First action step]
    Step1 --> Check1{Step 1 successful?}
    Check1 -->|yes| Step2[Second action step]
    Check1 -->|no| Abort1[[ABORT: Report - step 1 failed because X]]
    Step2 --> Check2{Step 2 successful?}
    Check2 -->|yes| Step3[Third action step]
    Check2 -->|no| Abort2[[ABORT: Report - step 2 failed because Y]]
    Step3 --> Check3{Step 3 successful?}
    Check3 -->|yes| End[End: Expected outcome]
    Check3 -->|no| Abort3[[ABORT: Report - step 3 failed because Z]]
```

NODE SHAPES
- Actions/steps: [square brackets]
- Decisions/conditions: {curly braces}
- ABORT points: [[double brackets]] - sub-agent must stop and report back
- End states: [square brackets]

CRITICAL RULES

1. EVERY action step MUST be followed by a decision diamond
   - Pattern: `Step[Do X] --> Check{X successful?}`
   - This is mandatory - no chains of action steps without verification
   - BAD: `Step1 --> Step2 --> Step3` (no verification)
   - GOOD: `Step1 --> Check1{OK?} --> Step2 --> Check2{OK?} --> Step3`

2. Every decision diamond MUST have TWO paths:
   - `-->|yes|` continues to next step (success path)
   - `-->|no|` leads to an ABORT node (failure path)

3. ABORT nodes must be labeled clearly:
   - `[[ABORT: Report - <specific reason>]]`
   - Examples:
     - `[[ABORT: Report - migration failed to apply]]`
     - `[[ABORT: Report - expected file not found]]`
     - `[[ABORT: Report - tests failing after change]]`

4. NO orbit terminology in the diagram:
   - Do NOT use "burn", "waypoint", "orbit", "trajectory" in node labels
   - Use plain implementation language: "step", "action", "task"
   - The sub-agent should see a straightforward implementation plan

OUTPUT FORMAT
Include the mermaid diagram in your delegation prompt to the sub-agent:

```
Follow this implementation plan. At each decision point (diamond), verify the condition.
If ANY condition fails, STOP immediately and report back with the ABORT message from that decision point.

[mermaid diagram here]
```

AFTER DELEGATION
When the sub-agent returns:
- On success: run `orbit burn complete <id> <burn#>`
- On abort: analyze the reason, then either:
  - `orbit burn abort <id> <burn#>` and add a new corrected burn
  - Adjust approach and re-delegate
  - Consult user if the issue is fundamental


EXAMPLE - Adding an API endpoint

```mermaid
flowchart TD
    Start[Start: Add CSV export endpoint to PatientController] --> S1[Find existing controller and identify endpoint patterns]
    S1 --> C1{Controller found with consistent patterns?}
    C1 -->|yes| S2[Add GET /patients/export endpoint following existing patterns]
    C1 -->|no| Abort1[[ABORT: Report - controller not found or inconsistent patterns]]
    S2 --> C2{Endpoint added and compiles?}
    C2 -->|yes| S3[Add request validation for query parameters]
    C2 -->|no| Abort2[[ABORT: Report - endpoint fails to compile, describe errors]]
    S3 --> C3{Validation works for valid and invalid inputs?}
    C3 -->|yes| S4[Run existing tests to verify no regressions]
    C3 -->|no| Abort3[[ABORT: Report - validation not working as expected]]
    S4 --> C4{All existing tests pass?}
    C4 -->|yes| End[End: Export endpoint added with validation]
    C4 -->|no| Abort4[[ABORT: Report - existing tests failing, describe failures]]
```
