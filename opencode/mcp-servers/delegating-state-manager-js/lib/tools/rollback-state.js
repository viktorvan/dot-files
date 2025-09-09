import { randomUUID } from 'crypto';

/**
  * Rollback State Tool
  * Handles rollback transitions to earlier states
  */
export async function handleRollbackState(args, { sessionManager, stateMachine }) {
  const { session_id, target_state } = args;
  let errorAlreadyLogged = false;
  
  try {
    // Require session_id and target_state
    if (!session_id) {
      const error = 'session_id is required for rollback operations.';
      throw new Error(error);
    }
    
    if (!target_state) {
      const error = 'target_state is required for rollback operations.';
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
    
    // Validate target state is a valid state
    const allStates = stateMachine.getAllStates();
    if (!allStates.includes(target_state)) {
      const error = `Invalid target_state: ${target_state}. Valid states are: ${allStates.join(', ')}`;
      await sessionManager.logTransitionFailure(session_id, 'invalid_target_state', error, `${currentState} -> ${target_state} (rollback)`);
      errorAlreadyLogged = true;
      throw new Error(error);
    }
    
    // Validate rollback direction (can only rollback to earlier states)
    const stateOrder = ['ANALYSIS', 'PLAN', 'REVIEW_PLAN', 'USER_APPROVAL', 'DELEGATION', 'REVIEW_IMPLEMENTATION', 'DONE'];
    const currentIndex = stateOrder.indexOf(currentState);
    const targetIndex = stateOrder.indexOf(target_state);
    
    if (currentIndex === -1 || targetIndex === -1) {
      const error = `Invalid state configuration for rollback: ${currentState} -> ${target_state}`;
      await sessionManager.logTransitionFailure(session_id, 'invalid_rollback_config', error);
      errorAlreadyLogged = true;
      throw new Error(error);
    }
    
    if (targetIndex >= currentIndex) {
      const error = `Cannot rollback to ${target_state} from ${currentState}. Target state must be earlier in the workflow.`;
      await sessionManager.logTransitionFailure(session_id, 'invalid_rollback_direction', error, `${currentState} -> ${target_state} (rollback)`);
      errorAlreadyLogged = true;
      throw new Error(error);
    }
    
    // Generate new state ID for rolled back state
    const newStateId = randomUUID();
    
    // Create rollback transition record
    const transitionRecord = {
      from_state: currentState,
      to_state: target_state,
      transition_type: 'rollback',
      timestamp: new Date().toISOString(),
      to_state_id: newStateId
    };
    
    // Always clear all review data on any rollback
    const updatedData = {
      current_state: target_state,
      state_id: newStateId,
      state_history: [...sessionData.state_history, transitionRecord],
      plan_review_id: null,
      plan_review_state: null,
      implementation_review_id: null,
      implementation_review_state: null
    };
    
    try {
      await sessionManager.updateSession(session_id, updatedData);
    } catch (error) {
      // Log session update failure
      await sessionManager.logTransitionFailure(session_id, 'session_update_error', `Failed to update session: ${error.message}`, `${currentState} -> ${target_state} (rollback)`);
      errorAlreadyLogged = true;
      throw error;
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          approved: true,
          state: target_state,
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
        let attemptedTransition = `unknown -> ${target_state} (rollback)`;
        
        try {
          const tempSessionData = await sessionManager.loadSession(session_id);
          currentState = tempSessionData.current_state;
          attemptedTransition = `${currentState} -> ${target_state} (rollback)`;
        } catch (stateError) {
          // If we can't load session, just use unknown
        }
        
        await sessionManager.logTransitionFailure(session_id, 'unexpected_error', error.message, attemptedTransition);
      } catch (logError) {
        // If logging fails, continue with original error
      }
    }
    
    throw new Error(`rollback_state failed: ${error.message}`);
  }
}
