# ANALYSIS State Instructions

## State Purpose
Gather information about the user's request through clarifying questions. Understand the problem scope, requirements, and constraints before proceeding to planning.

## Key Tools for This State
- `request_next_state`: when you have collected clarifying questions and user answers

## Step-by-Step Instructions
1. Analyze the user's initial request
2. Ask at least 3 clarifying questions to understand:
   - Specific requirements and constraints
   - Scope and boundaries of the work
   - Success criteria and expectations
3. WAIT for user answers - do not proceed without responses
4. Collect and organize the user's exact answers

## Definition of Done
- Clarifying questions have been asked
- User has provided answers
- You have clear understanding of the initinal request and answers

## Continue Behavior
- Call `request_next_state` after receiving and processing user answers
- If rejected, ask additional questions based on the error feedback
- If still unclear, ask more specific questions and try again

## Common Pitfalls
- Make sure to process the user's answers, and consider if you have more clarifying questions to ask.
