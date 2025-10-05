# REVIEW_PLAN State Instructions

## State Purpose
Delegate to a reviewer for plan validation. Ensure the plan meets quality standards before proceeding to user approval.

## Key Tools for This State
- `task`: when delegating review to a reviewer agent
- `review_review_plan_read`: when reading review results if not approved
- `request_next_state`: when you have a completed review to advance

## Step-by-Step Instructions
1. Delegate plan review to a reviewer agent:
   - Use the `task` tool with subagent_type "reviewer".
   - Keep the prompt concise and focused solely on the session_id, e.g., "Please review the implementation plan for session_id:
[session_id]."
   - Do NOT send the plan content in the prompt, and avoid including any additional instructions, validation points, or context to
prevent biasing the reviewer's analysis.
   - This ensures the reviewer performs an independent, standard review based on their predefined capabilities.
2. Wait for reviewer response
3. If review is not APPROVED:
   - Use `review_review_plan_read` to understand the feedback
   - Update your plan based on the review comments
   - Re-review and repeat until approved

## Definition of Done
- Review has been completed with APPROVED status

## Continue Behavior
- Call `request_next_state` when you have an approved review
- If rejected, ensure review process is complete and retry
- If review not approved, iterate on plan improvements

## Common Pitfalls
- Don't include plan content when delegating to reviewer
- Wait for actual reviewer response before advancing
- If the reviewer raises concerns, that require user input, consider rolling back to ANALYSIS state, to ask clarifying questions.
