# PLAN State Instructions

## State Purpose
Create a detailed implementation plan based on the analysis results. Document the current system, proposed changes, file modifications, testing strategy, and verification criteria.

## Key Tools for This State
- `read`: when you need to examine plan_format.xml for structure requirements
- `request_next_state`: when checking if your plan is complete and ready for review
- `plan_plan_add`: when saving the plan in XML format

## Step-by-Step Instructions
1. Read `./prompts/plan_format.xml` to understand the required plan structure
2. Create a detailed plan that includes:
   - Summary of the user request
   - Analysis of the current system (components, architecture, dependencies)
   - Proposed changes with strategy and rationale
   - Specific file changes (additions, modifications, deletions)
   - Testing strategy
   - Verification criteria
3. Save plan using plan_plan_add tool with the session_id
4. Output the plan in the specified format sections:
   - SUMMARY: 1-2 paragraph overview
   - CURRENT SYSTEM ANALYSIS: Bullet points on existing code/structure
   - PROPOSED CHANGES: High-level implementation steps
   - FILE CHANGES: List of files with specific modifications
   - TESTING STRATEGY: How to verify changes
   - VERIFICATION CRITERIA: Success metrics

## Definition of Done
- Complete plan covering all required sections
- Plan addresses the user's request from ANALYSIS
- All proposed changes are clearly documented

## Continue Behavior
- Call `request_next_state` frequently to check plan completeness
- If rejected, improve based on specific error feedback and retry immediately
- Continue iterating until plan is accepted

## Common Pitfalls
- Don't skip any required plan sections
- Ensure file changes are specific and actionable
- Base plan on actual analysis, not assumptions
