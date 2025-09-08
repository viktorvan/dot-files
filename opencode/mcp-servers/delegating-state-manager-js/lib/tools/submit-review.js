import { randomUUID } from 'crypto';

/**
 * Submit Review Tool
 * Handles plan and implementation review submission with verdict tracking
 */
export async function handleSubmitReview(args, { sessionManager, stateMachine }) {
  try {
    const { session_id, review_type, verdict } = args;
    
    if (!session_id) {
      throw new Error('Missing required parameter: session_id');
    }
    
    // Validate review_type
    if (!['PLAN', 'IMPLEMENTATION'].includes(review_type)) {
      throw new Error(`Invalid review_type: ${review_type}. Must be PLAN or IMPLEMENTATION`);
    }
    
    // Validate verdict  
    if (!['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(verdict)) {
      throw new Error(`Invalid verdict: ${verdict}. Must be APPROVED, REJECTED, or NEEDS_REVISION`);
    }
    
    // Load session
    const sessionData = await sessionManager.loadSession(session_id);
    
    // Generate review ID
    const reviewId = randomUUID();
    
    // Update session data with review
    let updateData;
    if (review_type === 'PLAN') {
      updateData = {
        plan_review_id: reviewId,
        plan_review_state: verdict
      };
    } else { // IMPLEMENTATION
      updateData = {
        implementation_review_id: reviewId,
        implementation_review_state: verdict
      };
    }
    
    await sessionManager.updateSession(session_id, updateData);
    
    return {
      content: [{
        type: "text", 
        text: JSON.stringify({
          success: true,
          review_id: reviewId,
          review_type: review_type,
          verdict: verdict,
          session: sessionManager._getSessionPath(session_id)
        })
      }]
    };
    
  } catch (error) {
    throw new Error(`submit_review failed: ${error.message}`);
  }
}