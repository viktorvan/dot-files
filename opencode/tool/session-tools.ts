import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { StateMachine } from '../lib/state-machine.js';
import type { StateType } from '../lib/types.js';

// Initialize shared instances
const sessionManager = new SessionManager();
const stateMachine = new StateMachine();

export const request_new_session = tool({
  description: 'Creates a new session in the ANALYSIS state',
  args: {},
  async execute(_args: {}, _context: ToolContext) {
    try {
      // Create new session (no parameters needed)
      // This guarantees immediate file creation on disk
      const newSession = await sessionManager.createSession();
      
      return JSON.stringify({
        approved: true,
        state: newSession.current_state,
        state_id: newSession.state_id,
        session_id: newSession.session_id,
        session: sessionManager._getSessionPath(newSession.session_id)
      });
      
    } catch (error) {
      throw new Error(`request_new_session failed: ${(error as Error).message}`);
    }
  }
});

export const request_next_state = tool({
  description: 'Handles state transitions with evidence validation (requires existing session)',
  args: {
    session_id: tool.schema.string().describe('Session identifier'),
    evidence: tool.schema.record(tool.schema.string(), tool.schema.any()).optional().describe('Evidence object for state transition'),
    notes: tool.schema.string().optional().describe('Optional notes for the transition')
  },
  async execute(args: { session_id: string; evidence?: Record<string, any>; notes?: string }, _context: ToolContext) {
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
          await sessionManager.logTransitionFailure(session_id, 'session_load_error', `Failed to load session: ${(error as Error).message}`);
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
        if (!(error as Error).message.includes('already at final state')) {
          await sessionManager.logTransitionFailure(session_id, 'invalid_state', (error as Error).message);
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
        const errorMessage = (error as Error).message;
        
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
      const { randomUUID } = await import('crypto');
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
        await sessionManager.logTransitionFailure(session_id, 'session_update_error', `Failed to update session: ${(error as Error).message}`, attemptedTransition);
        errorAlreadyLogged = true;
        throw error;
      }
      
      return JSON.stringify({
        approved: true,
        state: nextState,
        state_id: newStateId,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      // Final catch-all for any unhandled errors
      if (session_id && !errorAlreadyLogged) {
        try {
          // Try to determine current state for logging if possible
          let currentState: StateType | 'unknown' = 'unknown';
          let attemptedTransition = 'unknown';
          
          try {
            const tempSessionData = await sessionManager.loadSession(session_id);
            currentState = tempSessionData.current_state;
            const nextState = stateMachine.getNextState(currentState);
            attemptedTransition = nextState ? `${currentState} -> ${nextState}` : currentState;
          } catch (stateError) {
            // If we can't load session, just use unknown
          }
          
          await sessionManager.logTransitionFailure(session_id, 'unexpected_error', (error as Error).message, attemptedTransition);
        } catch (logError) {
          // If logging fails, continue with original error
        }
      }
      
      throw new Error(`request_next_state failed: ${(error as Error).message}`);
    }
  }
});

export const rollback_state = tool({
  description: 'Handles rollback transitions to earlier states',
  args: {
    session_id: tool.schema.string().describe('Session identifier'),
    target_state: tool.schema.string().describe('Target state to rollback to'),
    notes: tool.schema.string().optional().describe('Optional notes for the rollback')
  },
  async execute(args: { session_id: string; target_state: string; notes?: string }, _context: ToolContext) {
    const { session_id, target_state, notes = '' } = args;
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
          await sessionManager.logTransitionFailure(session_id, 'session_load_error', `Failed to load session: ${(error as Error).message}`);
        } catch (logError) {
          // Session doesn't exist, so we can't log to it
        }
        throw error;
      }
      
      const currentState = sessionData.current_state;
      
      // Validate target state is a valid state
      const allStates = stateMachine.getAllStates();
      if (!allStates.includes(target_state as StateType)) {
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
      const { randomUUID } = await import('crypto');
      const newStateId = randomUUID();
      
      // Create rollback transition record
      const transitionRecord = {
        from_state: currentState,
        to_state: target_state as StateType,
        transition_type: 'rollback',
        notes: notes,
        timestamp: new Date().toISOString(),
        to_state_id: newStateId
      };
      
      // Always clear all review data on any rollback
      const updatedData = {
        current_state: target_state as StateType,
        state_id: newStateId,
        state_history: [...sessionData.state_history, transitionRecord],
        plan_review_id: null,
        implementation_review_id: null
      };
      
      try {
        await sessionManager.updateSession(session_id, updatedData);
      } catch (error) {
        // Log session update failure
        await sessionManager.logTransitionFailure(session_id, 'session_update_error', `Failed to update session: ${(error as Error).message}`, `${currentState} -> ${target_state} (rollback)`);
        errorAlreadyLogged = true;
        throw error;
      }
      
      return JSON.stringify({
        approved: true,
        state: target_state,
        state_id: newStateId,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      // Final catch-all for any unhandled errors
      if (session_id && !errorAlreadyLogged) {
        try {
          // Try to determine current state for logging if possible
          let currentState: StateType | 'unknown' = 'unknown';
          let attemptedTransition = `unknown -> ${target_state} (rollback)`;
          
          try {
            const tempSessionData = await sessionManager.loadSession(session_id);
            currentState = tempSessionData.current_state;
            attemptedTransition = `${currentState} -> ${target_state} (rollback)`;
          } catch (stateError) {
            // If we can't load session, just use unknown
          }
          
          await sessionManager.logTransitionFailure(session_id, 'unexpected_error', (error as Error).message, attemptedTransition);
        } catch (logError) {
          // If logging fails, continue with original error
        }
      }
      
      throw new Error(`rollback_state failed: ${(error as Error).message}`);
    }
  }
});

export const get_current_state = tool({
  description: 'Returns current state and state_id for a given session_id',
  args: {
    session_id: tool.schema.string().describe('Session identifier')
  },
  async execute(args: { session_id: string }, _context: ToolContext) {
    try {
      const { session_id } = args;
      
      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }
      
      // Load session
      const sessionData = await sessionManager.loadSession(session_id);
      
      return JSON.stringify({
        current_state: sessionData.current_state,
        state_id: sessionData.state_id,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      throw new Error(`get_current_state failed: ${(error as Error).message}`);
    }
  }
});
