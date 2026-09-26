# USER_APPROVAL State Instructions

## State Purpose
Present the complete plan to the user and wait for their explicit approval before proceeding to implementation. This is a critical checkpoint ensuring user alignment.

## Key Tools for This State
- `request_next_state`: when user has provided approval response
- `session_rollback_state`: when user requests changes or does not approve

## Step-by-Step Instructions
1. Present the complete final plan using this format:
   - SUMMARY: 1-2 paragraph overview
   - CURRENT SYSTEM ANALYSIS: Bullet points on existing code/structure  
   - PROPOSED CHANGES: High-level implementation steps
   - FILE CHANGES: List of files with specific modifications
   - TESTING STRATEGY: How to verify changes
   - VERIFICATION CRITERIA: Success metrics
2. Ask: "Here is the plan. Do you approve or suggest modifications?"
3. WAIT for explicit user response - do not proceed automatically
4. Handle user response appropriately

## Definition of Done
- Plan has been presented in complete format
- User has provided explicit response
- Response has been processed appropriately

## Continue Behavior
- Call `request_next_state` when user provides approval
- Use `session_rollback_state` to return to PLAN if user requests changes
- If user response is unclear, ask for clarification and continue waiting

## Common Pitfalls
- Never proceed without waiting for user input
- Don't skip presenting the complete plan in all required sections
- Remember this is one of only two user interaction states
