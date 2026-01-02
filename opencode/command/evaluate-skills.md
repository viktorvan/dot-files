---
description: Evaluate all available skills for current context
---

## Context

Skills are specialized instruction sets that enhance your capabilities for specific types of tasks. This command ensures you identify and activate relevant skills based on the current work context.

## Your Task

Follow this process to evaluate and activate skills:

### Step 1: Discover Available Skills

Check what skills are currently available in your skill system. You have access to a skill tool - examine its available skills or check the skill directory to see what's installed.

### Step 2: Analyze Current Context

Consider what you're currently working on:
- What did the user just request?
- What type of work are you about to perform?
- What outputs will you produce (code, documentation, analysis, etc.)?
- Is there feedback to process or creative work to design?

### Step 3: Evaluate Each Skill

For each available skill:
1. Read the skill's description to understand its purpose
2. Determine if it matches your current context
3. Ask: "Would this skill's guidance improve the work I'm about to do?"

**Evaluation criteria:**
- **YES** if the skill directly applies to your immediate task
- **NO** if the skill isn't relevant to current work
- **When uncertain**: Prefer YES - skills add value without harm

### Step 4: Activate Relevant Skills

For each skill evaluated as YES:
1. Load it using the skill tool
2. Apply its guidance to your work

## Output Format

Present your evaluation clearly:

```
**Available Skills Discovered:**
[List skills found in the system]

**Skill Evaluation:**
- [skill-name]: [YES/NO] - [Brief justification]
- [skill-name]: [YES/NO] - [Brief justification]
...

**Activations:**
[If any YES: "Activating [skill-names]..." then use skill tool]
[If all NO: "No skills needed for current context"]
```

## Important Guidelines

1. **Evaluate current context only** - Don't activate skills for hypothetical future work
2. **Be honest** - If no skills apply, that's valid
3. **Activate before proceeding** - Load relevant skills BEFORE continuing other work
4. **One evaluation cycle** - Focus on the immediate context, not the entire session

## Generic Examples

**Example 1: Documentation Task**
```
**Available Skills Discovered:**
- writing-clearly-and-concisely
- code-review-helper
- api-documentation-guide

**Skill Evaluation:**
- writing-clearly-and-concisely: YES - Writing API documentation requires clear prose
- code-review-helper: NO - Not reviewing code currently
- api-documentation-guide: YES - Directly relevant to API docs task

**Activations:**
Activating writing-clearly-and-concisely and api-documentation-guide...
```

**Example 2: No Skills Needed**
```
**Available Skills Discovered:**
- sql-optimization
- testing-strategy

**Skill Evaluation:**
- sql-optimization: NO - Current task is JavaScript array manipulation
- testing-strategy: NO - Not writing tests right now

**Activations:**
No skills needed for current context
```
