---
name: plot-trajectory
description: Creates or updates a saved Mermaid trajectory using the configured waypoints and proposed burns.
---

# Plot a trajectory

1. Read the current Orbit state, waypoint rules, and any saved trajectory.
2. Use the agreed requirements and decisions. Reuse an existing plan when it still fits.
3. If a necessary decision is unresolved, ask the user before completing the plan.
4. Draw a Mermaid flowchart with the remaining waypoints in configured order.
5. Show proposed burns, dependencies, verification, and approval gates.
6. Give each burn one cohesive result, acceptance criteria, and required verification.
7. Save the diagram with `orbit trajectory plot <orbit-id>` through stdin.
8. Show the plan and briefly explain important decisions and tradeoffs.

Use decision diamonds where results change the route. Label the branches and show where work stops for the user.
Follow waypoint rules for optional routes and approval gates.
Do not schedule burns or implement changes in this skill.
A saved trajectory does not replace the current waypoint's approval requirement.
