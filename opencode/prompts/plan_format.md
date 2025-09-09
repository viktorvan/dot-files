# PLAN FORMAT

## Required Sections

session_id: <session_id>

#### 1. SUMMARY
**User Request**  
- Concise restatement of the user’s request and clarifications.

#### 2. CURRENT SYSTEM ANALYSIS
**Existing Implementation**  
- Key components, files, and relationships.  
- Relevant architecture patterns and conventions.  
- Dependencies and integrations.  

#### 3. PROPOSED CHANGES
**High-Level Approach**  
- Strategy and rationale.  
- Expected impact on existing functionality.  

#### 4. FILE CHANGES (MANDATORY)
Format: `ACTION: path/to/file.fs - short description`

- ADD: …  
- MODIFY: …  
- DELETE: …  

#### 5. TESTING STRATEGY
**Unit Tests**  
- New tests to cover new functions/branches.  
- Modified tests for updated logic.

**Integration Tests**  
- New or updated tests for service/API interactions.

**Scenario Tests**  
- End-to-end workflows, including edge cases and backward compatibility.  

*(Keep concise — list coverage areas, not every single test name.)*

#### 6. VERIFICATION CRITERIA
**Manual Checks**  
- API endpoints to verify.  
- Key business rules to validate.  
- Edge cases to confirm.  
