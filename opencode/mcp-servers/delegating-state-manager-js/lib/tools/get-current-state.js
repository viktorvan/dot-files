/**
 * Get Current State Tool
 * Returns current state and state_id for a given session_id
 */
export async function handleGetCurrentState(args, { sessionManager, stateMachine }) {
  try {
    const { session_id } = args;
    
    if (!session_id) {
      throw new Error('Missing required parameter: session_id');
    }
    
    // Load session
    const sessionData = await sessionManager.loadSession(session_id);
    
    return {
      content: [{
        type: "text", 
        text: JSON.stringify({
          current_state: sessionData.current_state,
          state_id: sessionData.state_id,
          session: sessionManager._getSessionPath(session_id)
        })
      }]
    };
    
  } catch (error) {
    throw new Error(`get_current_state failed: ${error.message}`);
  }
}