import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { StateMachine } from '../lib/state-machine.js';
import type { ReviewState } from '../lib/types.js';
import { randomUUID } from 'crypto';

// Initialize shared instances
const sessionManager = new SessionManager();
const stateMachine = new StateMachine();

export const submit_review = tool({
  description: 'Submit review for plan or implementation with verdict tracking',
  args: {
    session_id: tool.schema.string().describe('Session identifier'),
    review_type: tool.schema.string().describe('Type of review: PLAN or IMPLEMENTATION'),
    verdict: tool.schema.string().describe('Review verdict: APPROVED, REJECTED, or NEEDS_REVISION')
  },
  async execute(args: { session_id: string; review_type: string; verdict: string }, _context: ToolContext) {
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
          plan_review_state: verdict as ReviewState
        };
      } else { // IMPLEMENTATION
        updateData = {
          implementation_review_id: reviewId,
          implementation_review_state: verdict as ReviewState
        };
      }
      
      await sessionManager.updateSession(session_id, updateData);
      
      return JSON.stringify({
        success: true,
        review_id: reviewId,
        review_type: review_type,
        verdict: verdict,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      throw new Error(`submit_review failed: ${(error as Error).message}`);
    }
  }
});