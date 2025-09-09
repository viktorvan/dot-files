import { randomUUID } from 'crypto';

/**
 * Request New Session Tool
 * Creates a new session in the ANALYSIS state
 */
export async function handleRequestNewSession(args, { sessionManager }) {
  try {
    // Create new session (no parameters needed)
    // This guarantees immediate file creation on disk
    const newSession = await sessionManager.createSession();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          approved: true,
          state: newSession.current_state,
          state_id: newSession.state_id,
          session_id: newSession.session_id,
          session: sessionManager._getSessionPath(newSession.session_id)
        })
      }]
    };
    
  } catch (error) {
    throw new Error(`request_new_session failed: ${error.message}`);
  }
}