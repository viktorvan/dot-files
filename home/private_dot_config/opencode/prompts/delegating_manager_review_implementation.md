# REVIEW_IMPLEMENTATION State Instructions

## State Purpose
Delegate implementation review to a reviewer agent to ensure all tasks were completed correctly and the implementation meets quality standards.

## Key Tools for This State
- `task`: when delegating review to a reviewer agent
- `review_review_implementation_read`: when reading review results if not approved
- `request_next_state`: when you have a completed implementation review

## Step-by-Step Instructions
1. Delegate implementation review to a reviewer agent:
   - Use the `task` tool with subagent_type "reviewer"
   - Ask for implementation review for the current session_id
   - Provide context about what was implemented
2. Wait for reviewer response
3. If review is not APPROVED:
   - Use `review_review_implementation_read` to understand the feedback
   - Use `session_rollback_state` to return to DELEGATION
   - Address the identified issues by creating corrective tasks
   - Re-delegate and repeat until approved

## Definition of Done
- Reviewer has been delegated
- Implementation review has been completed
- Review status is APPROVED

## Continue Behavior
- Call `request_next_state` when you have an approved implementation review
- If rejected, ensure review process is complete and retry
- If review not approved, rollback to DELEGATION to address issues

## Common Pitfalls
- Wait for reviewer response before advancing
- Address all reviewer feedback before attempting to advance
