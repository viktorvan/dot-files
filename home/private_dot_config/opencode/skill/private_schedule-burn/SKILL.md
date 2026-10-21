---
name: schedule-burn
description: Plans and schedules one Orbit burn with a Mermaid diagram and explicit abort paths before delegation to pilot.
---

# Schedule a burn

## Size the burn

- Give each burn one bounded outcome that a pilot can implement and verify with the supplied context.
- Keep related implementation changes, necessary tests, and self-review together.
- Split independent outcomes or work that requires substantially different context.
- Resolve open design decisions before scheduling implementation.

## Prepare the plan

1. Supply the goal, scope limits, relevant context, acceptance criteria, and required checks.
2. Include the checks and review required by the waypoint rules, using project verification commands.
3. Draw a Mermaid flowchart with the main steps and meaningful decision points.

Show abort paths for failed assumptions, scope changes, and failures that require broader investigation.
Allow correction of the pilot's own mistakes within scope. Avoid a decision diamond after every routine action.
Keep the diagram focused on implementation. Do not repeat all instructions in its nodes.

Pass the diagram through stdin:

````sh
orbit burn schedule <orbit-id> <waypoint> "<description>" "<instructions>" --context "<context>" <<'EOF'
```mermaid
flowchart TD
    Check{Required assumptions hold?} -->|yes| Work[Implement and verify within scope]
    Check -->|no| Abort[[ABORT: Report failed assumption]]
    Work --> Result{Acceptance criteria met?}
    Result -->|yes| Done[Report changes and verification]
    Result -->|no| Cause{Own mistake with an understood fix within scope?}
    Cause -->|yes| Fix[Correct the mistake]
    Fix --> Work
    Cause -->|no| Blocked[[ABORT: Report failure and partial changes]]
```
EOF
````

Replace the example with task-specific conditions. Then delegate to `pilot` with the returned burn number:

```yaml
---
orbit-id: <orbit-id>
burn-number: <burn-number>
---
```

The pilot loads the plan with `orbit burn initiate`.
Handle the result according to the Orbit rules.
