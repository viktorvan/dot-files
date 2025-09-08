import { randomUUID } from 'crypto';

/**
 * Request Next State Tool
 * Handles state transitions with evidence validation (requires existing session)
 */
export async function handleRequestNextState(args, { sessionManager, stateMachine }) {
  const { session_id, evidence = {}, notes = '' } = args;
  let errorAlreadyLogged = false;
  
  try {
    // Require session_id - no longer handles session creation
    if (!session_id) {
      const error = 'session_id is required for state transitions. Use request_new_session to create a new session.';
      // Can't log to session since we don't have a session_id
      throw new Error(error);
    }
    
    // Load existing session
    let sessionData;
    try {
      sessionData = await sessionManager.loadSession(session_id);
    } catch (error) {
      // Log session loading failure
      try {
        await sessionManager.logTransitionFailure(session_id, 'session_load_error', `Failed to load session: ${error.message}`);
      } catch (logError) {
        // Session doesn't exist, so we can't log to it
      }
      throw error;
    }
    
    const currentState = sessionData.current_state;
    
    // Get next state
    let nextState;
    try {
      nextState = stateMachine.getNextState(currentState);
      if (!nextState) {
        const attemptedTransition = `${currentState} -> [terminal]`;
        const error = `Cannot transition from state: ${currentState} (already at final state)`;
        
        // Log terminal state transition attempt
        await sessionManager.logTransitionFailure(session_id, 'terminal_state', error, attemptedTransition);
        errorAlreadyLogged = true;
        throw new Error(error);
      }
    } catch (error) {
      // Log state machine error if not already logged
      if (!error.message.includes('already at final state')) {
        await sessionManager.logTransitionFailure(session_id, 'invalid_state', error.message);
        errorAlreadyLogged = true;
      }
      throw error;
    }
    
    // Validate evidence for current state
    const attemptedTransition = `${currentState} -> ${nextState}`;
    try {
      stateMachine.validateEvidence(currentState, evidence, sessionData);
    } catch (error) {
      // Categorize evidence validation failures
      let failureType = 'validation_error';
      const errorMessage = error.message;
      
      if (errorMessage.includes('Missing required fields')) {
        failureType = 'missing_evidence';
      } else if (errorMessage.includes('must be at least')) {
        failureType = 'invalid_format';
      } else if (errorMessage.includes('does not exist in session')) {
        failureType = 'invalid_reference';
      } else if (errorMessage.includes('review_id does not match') || errorMessage.includes('verdict must be APPROVED')) {
        failureType = 'review_mismatch';
      } else if (errorMessage.includes('status')) {
        failureType = 'task_status_error';
      }
      
      // Log evidence validation failure
      await sessionManager.logTransitionFailure(session_id, failureType, errorMessage, attemptedTransition);
      errorAlreadyLogged = true;
      throw error;
    }
    
    // Generate new state ID
    const newStateId = randomUUID();
    
    // Create state transition record
    const transitionRecord = {
      from_state: currentState,
      to_state: nextState,
      evidence: evidence,
      notes: notes,
      timestamp: new Date().toISOString(),
      to_state_id: newStateId
    };
    
    // Update session data
    const updatedData = {
      current_state: nextState,
      state_id: newStateId,
      state_history: [...sessionData.state_history, transitionRecord]
    };
    
    try {
      const updatedSession = await sessionManager.updateSession(session_id, updatedData);
    } catch (error) {
      // Log session update failure
      await sessionManager.logTransitionFailure(session_id, 'session_update_error', `Failed to update session: ${error.message}`, attemptedTransition);
      errorAlreadyLogged = true;
      throw error;
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          approved: true,
          state: nextState,
          state_id: newStateId,
          session: sessionManager._getSessionPath(session_id)
        })
      }]
    };
    
  } catch (error) {
    // Final catch-all for any unhandled errors
    if (session_id && !errorAlreadyLogged) {
      try {
        // Try to determine current state for logging if possible
        let currentState = 'unknown';
        let attemptedTransition = 'unknown';
        
        try {
          const tempSessionData = await sessionManager.loadSession(session_id);
          currentState = tempSessionData.current_state;
          const nextState = stateMachine.getNextState(currentState);
          attemptedTransition = nextState ? `${currentState} -> ${nextState}` : currentState;
        } catch (stateError) {
          // If we can't load session, just use unknown
        }
        
        await sessionManager.logTransitionFailure(session_id, 'unexpected_error', error.message, attemptedTransition);
      } catch (logError) {
        // If logging fails, continue with original error
      }
    }
    
    throw new Error(`request_next_state failed: ${error.message}`);
  }
}