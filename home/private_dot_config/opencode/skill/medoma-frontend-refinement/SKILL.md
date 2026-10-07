---
name: medoma-frontend-refinement
description: "Refine a Linear issue for React frontend implementation. Fetches issue details, queries domain knowledge, investigates frontend codebase patterns, and posts refinement as a Linear comment."
metadata:
  use-cases:
    - "Refining a Linear issue for frontend work"
    - "Analyzing feasibility and suggesting frontend implementation approaches"
    - "Posting implementation options as Linear comments"
---

# Medoma Frontend Refinement

Refine a Linear issue for what work is needed in the React frontend. Produce a refinement comment on the Linear issue with either clarifying questions or implementation plan options.

## Prerequisites

Before starting refinement, load:
1. Load the `medoma-platform` skill -- for domain knowledge about the Medoma platform

## Input

This skill requires a **Linear issue identifier** (e.g., `MED-1234`). The user must provide one.

## Workflow

### Step 1: Fetch the Linear issue

Use `linear_get_issue` to fetch the issue details. Read the title, description, and any comments. If the issue has images in the description, use `linear_extract_images` to view them -- frontend issues often include mockups or screenshots.

### Step 2: Gather domain context

Use the `medoma-platform` skill to query the knowledge base for domain concepts referenced in the issue. Understand how the feature relates to the platform from a user's perspective and which application it targets (Center, Go, or Care).

### Step 3: Investigate the frontend codebase

Explore the React frontend codebase to understand:
- **Existing components**: Reusable components, design system patterns, UI libraries
- **State management**: How state is managed (contexts, stores, hooks)
- **API integration**: How the frontend communicates with the backend (API clients, hooks, query patterns)
- **Routing**: How pages and navigation are structured
- **Related pages/features**: Existing implementations of similar features
- **Test patterns**: How components and hooks are tested

Use the `explore` sub-agent for codebase investigation when the search scope is broad.

### Step 4: Assess requirements clarity

Evaluate whether the issue provides enough information to plan implementation:

**Requirements are UNCLEAR if any of these apply:**
- The issue describes a feature without mockups or clear UI behavior
- It's unclear which application (Center, Go, Care) is affected
- User interaction patterns aren't specified (e.g., form validation, error states, loading states)
- The scope is vague (e.g., "improve the patient view" without specifics)
- There are contradictions between the description and any attached designs
- Responsiveness or accessibility requirements aren't addressed when relevant

**Requirements are CLEAR if:**
- The desired UI behavior is well-defined (or can be reasonably inferred from existing patterns)
- The target application is clear
- Edge cases for user interaction are addressed or can be inferred
- The scope is bounded

### Step 5: Post refinement to Linear

Use `linear_save_comment` to post the refinement result as a comment on the issue.

#### If requirements are UNCLEAR -- post clarifying questions:

```markdown
## Frontend Refinement -- Clarifying Questions

Before planning the frontend implementation, the following needs clarification:

1. **[Question about specific ambiguity]**
   Context: [Why this matters for implementation]

2. **[Question about UI/UX detail]**
   Context: [What the current UI does and why this needs a decision]

[... more questions as needed]

### What I found so far
- [Relevant existing components/patterns]
- [Relevant domain context from knowledge base]
- [Related features in the current frontend]

---
*Automated refinement by medoma-frontend-refinement*
```

#### If requirements are CLEAR -- post implementation options:

```markdown
## Frontend Refinement -- Implementation Options

### Context
[Brief summary of the feature, target application, and relevant domain knowledge]

### Codebase findings
- [Existing components that can be reused]
- [Related pages/features and their structure]
- [API endpoints available / needed]

### Option A: [Descriptive name] (Recommended)
**Approach**: [How this would be implemented]
**Changes**:
- [Components: new/modified components]
- [State: new hooks, contexts, or store changes]
- [API: new queries/mutations needed]
- [Routing: new routes or navigation changes]
- [Tests: what needs testing]

**Pros**: [Why this is recommended]
**Cons**: [Tradeoffs]
**Estimated scope**: [Small/Medium/Large]

### Option B: [Descriptive name]
**Approach**: [How this would be implemented]
**Changes**:
- [Same breakdown as above]

**Pros**: [Advantages]
**Cons**: [Why this isn't recommended]
**Estimated scope**: [Small/Medium/Large]

[... Option C if warranted]

### Recommendation
[Which option and why, considering existing patterns, UX consistency, and scope]

---
*Automated refinement by medoma-frontend-refinement*
```

## Rules

- Always provide at least 2 implementation options when requirements are clear
- Always recommend one option and explain why
- Ground options in actual codebase patterns -- reference specific components and pages
- Consider UX consistency with existing features in the same application
- Keep the comment concise and actionable -- designers and developers will read it
- Do NOT implement anything -- this is refinement only
- Do NOT create branches, commits, or PRs
- Post the comment directly to the Linear issue without asking for user approval
