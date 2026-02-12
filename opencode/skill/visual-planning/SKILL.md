---
name: visual-planning
description: Use this skill to make a visual plan before implementing a task. Use when prompted to, or suggest to use it when a task is complex enough to require a visual plan.
---

GOAL
Create an implementation-ready plan for the Task using a Mermaid flowchart + a short summary. DO NOT write or suggest any code yet.

WORKFLOW (follow in order)
1. DISCOVERY PHASE (do this FIRST, before any diagram)
   - Analyze the task requirements thoroughly
   - Explore relevant code/docs/context as needed
   - Identify unknowns, ambiguities, and decisions that need user input
   - Ask ALL clarifying questions in a single message
   - WAIT for user responses before proceeding

2. PLANNING PHASE (only after discovery is complete)
   - Once you have sufficient clarity, create the visual plan
   - Output EXACTLY two parts: the Mermaid diagram + 3-5 bullet summary
   - The bullets summarize the COMPLETED plan, they do NOT ask questions

HARD RULES
- Do NOT create the diagram until all critical questions are answered
- Do NOT implement, draft code, propose patches, or include file contents. Planning only.
- Do NOT begin implementation until I explicitly reply with: "APPROVED: IMPLEMENT".
- The final plan output must contain EXACTLY two parts and NOTHING ELSE:
  (1) a single Mermaid code block
  (2) exactly 3–5 bullet points summarizing the plan
- No preface, no extra headings, no extra paragraphs, no checklists, no "next steps" outside the bullets.
- Bullets are a SUMMARY of decisions made, NOT questions or open items.

MERMAID REQUIREMENTS
- Use: flowchart TD
- DO NOT use quoted labels (no ["..."] or subgraph X["..."])
- All node and subgraph labels MUST be unquoted plain text
- Start node label: Start: <brief task summary>   (no quotes)
- End node label: End: <expected outcome>         (no quotes)
- Use shapes:
  - Actions/steps: [like this]
  - Decisions/conditions: {like this}
  - Inputs/outputs: (like this)
- Every decision must have labeled edges (yes/no or success/error).
- Include: validation, edge cases, failure handling, and rollback/escape path where relevant.
- Include integration points (APIs/services/modules), test strategy nodes, and observability (logging/metrics) if applicable.
- Keep nodes implementation-oriented (what to do), not narrative.

BULLET REQUIREMENTS (exactly 3–5 bullets)
- Bullets summarize: key design decisions, approach chosen, and any accepted tradeoffs.
- These are statements about the plan, NOT questions or requests for confirmation.
- No additional formatting besides simple "-" bullets.
