---
description: Add a new coding standard to CODING_STANDARDS.md
---

# Task: Add New Coding Standard

Append the CODING_STANDARDS.md file with a new coding standard based on the provided context.

## Requirements

### 1. Verify File Exists

- Check if `CODING_STANDARDS.md` exists in the repository root
- If file does not exist, create it with the standard header format:
  ```markdown
  # Coding Standards & Style Guide

  This document contains code review feedback, coding standards, and style conventions for this codebase. Use this for self-review before submitting changes.

  ---
  ```

### 2. Understand the New Standard

Parse the context from: $ARGUMENTS

The input may be:
- A direct description of the standard to add
- A reference to recent discussion (e.g., "add a rule for the change we just discussed")
- An example of problematic code that should be avoided

If the input references recent discussion, look back in the conversation history to understand:
- What code pattern was discussed
- What problem it caused or solved
- What the preferred approach is

### 3. Format the Standard

Follow the established format from the file:
```markdown
## [Category Name]

### ❌ [NEVER/DO NOT]: [Anti-pattern Description]

**Problem**: [Explanation of why this is problematic]

**Bad Example**:
```[language]
[code example showing what NOT to do]
```

### ✅ DO: [Best Practice Description]

**Solution**: [Explanation of the correct approach]

**Good Example**:
```[language]
[code example showing correct approach]
```

**Pattern Explanation**:
- [Key points about the pattern]

**Benefits**:
- [Why this approach is better]

**Reference**: [Optional: point to example files in codebase]

---
```

### 4. Determine Placement

- If the standard fits an existing category, append it to that section
- If it's a new category, add it at the end before the closing note
- Maintain the horizontal rule separators (`---`) between sections

### 5. Append to File

- Preserve all existing content
- Add the new standard in the appropriate location
- Ensure proper markdown formatting
- Keep the closing note at the bottom:
  ```markdown
  *This file is a living document. Add new standards as they emerge during code reviews.*
  ```

### 6. Confirm Changes

After updating the file:
- Show a brief summary of what was added
- Indicate the category and section title
- Confirm the file was updated successfully

## Important Notes

- Match the tone and style of existing standards
- Be specific with code examples
- Focus on the "why" behind the standard, not just the "what"
- Use clear section headers
- Include both anti-patterns (❌) and best practices (✅)
- If creating examples, ensure they're realistic and helpful
- Maintain consistent formatting with existing standards
