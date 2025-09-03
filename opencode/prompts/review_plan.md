# REVIEW PLAN CHECKLIST

When reviewing a proposed implementation plan, verify:

1. **Format compliance**  
   - All required sections from `prompts/plan_format.md` are present.  
   - Formatting is consistent and complete.  

2. **Technical quality**  
   - Approach follows F# / .NET best practices.  
   - No obvious anti-patterns or design flaws.  
   - Code organization is clean and idiomatic.  

3. **Completeness**  
   - Plan fully addresses the original user request.  
   - No major gaps, missing features, or skipped steps.  

4. **Risks & issues**  
   - Identify potential implementation risks.  
   - Call out performance or integration concerns.  

5. **Testing strategy**  
   - Adequate unit, integration, and scenario tests are included.  

6. **File-level guidance**  
   - Suggest specific modifications using:  
     `ACTION: path/to/file.fs`  

7. **Final assessment**  
   - Approve only if plan is solid and complete.  
   - Response must end with: **APPROVED / NEEDS REVISION / REJECTED**  
