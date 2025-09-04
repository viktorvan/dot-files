# REVIEW IMPLEMENTATION FORMAT

## Required Sections

#### 1. IMPLEMENTATION ANALYSIS
- Verify that code changes match the approved plan.  
- Check that only the listed files were modified, added, or deleted.  
- Identify and justify any deviations from the plan.  
- Assess correctness, quality, and adherence to F# / .NET best practices.  

#### 2. DEFINITION OF DONE VERIFICATION
For each sub-task:  
- Run all DoD commands (build, test, format, etc.).  
- Capture stdout/stderr and exit codes.  
- Confirm success criteria are met.  
- Report any failures with details.  

#### 3. RISKS & ISSUES
- Highlight integration or performance risks.  
- Note maintainability or readability concerns.  
- Flag missing edge cases or incomplete testing.  

#### 4. REQUIRED FIXES (IF NEEDED)
Format: `ACTION: path/to/file.fs - Reason`  
- List corrections required before approval (e.g., add missing tests, fix build errors, remove stray edits).  

#### 5. FINAL ASSESSMENT
- Status: **APPROVED / NEEDS REVISION / REJECTED**  
- Summary: Brief overall judgment and justification.  
