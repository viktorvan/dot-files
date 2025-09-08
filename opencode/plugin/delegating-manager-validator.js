/**
 * Delegating Manager Validator Plugin (Production Version)
 * 
 * Validates ONLY final agent messages from delegating manager agents.
 * Skips tool calls to avoid blocking the workflow.
 */

import { readFile } from 'fs/promises';
import { SessionManager } from '../mcp-servers/delegating-state-manager-js/lib/session.js';

export const DelegatingManagerValidator = async ({ project, client, $, directory, worktree }) => {
  console.log("🔍 Delegating Manager Validator (Production) plugin initialized");

  // Initialize session manager for logging validation failures
  const sessionManager = new SessionManager('./sessions');

  // Valid states from the delegating manager workflow
  const VALID_STATES = [
    'ANALYSIS', 'PLAN', 'REVIEW_PLAN', 'USER_APPROVAL', 'DELEGATION', 'REVIEW_IMPLEMENTATION', 'DONE', 'OVERRIDE'
  ];

  // Valid agent name variations for delegating manager
  const DELEGATING_AGENT_PATTERNS = [
    /delegat/i,
    /manager/i
  ];

  // UUID regex pattern (RFC 4122 compliant)
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Checks if an agent is using the delegating manager prompt
   */
  const isDelegatingManagerAgent = (agentName) => {
    if (!agentName || typeof agentName !== 'string') {
      return false;
    }
    
    const normalizedName = agentName.toLowerCase();
    return DELEGATING_AGENT_PATTERNS.some(pattern => pattern.test(normalizedName));
  };

  /**
   * Validates the JSON header format and content
   */
  const validateMessageHeader = (message) => {
    const lines = message.split('\n');
    if (lines.length === 0) {
      throw new Error('Message is empty');
    }

    const firstLine = lines[0].trim();
    if (!firstLine) {
      throw new Error('First line of message is empty - expected JSON header with state, state_id, and session');
    }

    // Parse JSON header
    let headerJson;
    try {
      headerJson = JSON.parse(firstLine);
    } catch (error) {
      throw new Error(`Invalid JSON header on first line: ${error.message}\nExpected format: { "<STATE>": "<guid>", "session": "<session-filepath>" }\nActual: ${firstLine}`);
    }

    // Extract session filepath
    const sessionFilepath = headerJson.session;
    
    // Validate session is present
    if (!sessionFilepath) {
      throw new Error(`Missing session in header\nExpected format: { "<STATE>": "<guid>", "session": "<session-filepath>" }\nActual: ${JSON.stringify(headerJson)}`);
    }

    if (typeof sessionFilepath !== 'string') {
      throw new Error(`session must be a string filepath\nActual: ${JSON.stringify(headerJson)}`);
    }

    // Validate the state portion - should have exactly one state key plus session
    const stateKeys = Object.keys(headerJson).filter(key => key !== 'session');
    if (stateKeys.length !== 1) {
      throw new Error(`JSON header must have exactly one state key plus session\nExpected format: { "<STATE>": "<guid>", "session": "<session-filepath>" }\nActual: ${JSON.stringify(headerJson)}`);
    }

    const state = stateKeys[0];
    const stateId = headerJson[state];

    // Validate state name
    if (!VALID_STATES.includes(state)) {
      throw new Error(`Invalid state "${state}"\nValid states: ${VALID_STATES.join(', ')}\nActual header: ${JSON.stringify(headerJson)}`);
    }

    // Validate state_id format
    if (typeof stateId !== 'string') {
      throw new Error(`State ID must be a string\nExpected format: { "${state}": "<guid>", "session": "<session-filepath>" }\nActual: ${JSON.stringify(headerJson)}`);
    }

    if (!UUID_REGEX.test(stateId)) {
      throw new Error(`Invalid UUID format for state_id: "${stateId}"\nExpected: valid UUID (e.g., "7BF82759-D057-4FA9-A0FA-D01960F0B9DD")\nActual header: ${JSON.stringify(headerJson)}`);
    }

    return { state, stateId, sessionFilepath };
  };

  /**
   * Extract session ID from filepath for logging
   */
  const extractSessionId = (sessionFilepath) => {
    // Extract session ID from filepath like "./sessions/2025-09-07-17-23-04-mubh0m.json"
    const parts = sessionFilepath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.json', '');
  };

  /**
   * Reads and validates against the current session state
   */
  const validateAgainstSessionState = async (state, stateId, sessionFilepath) => {
    let sessionState;
    const sessionId = extractSessionId(sessionFilepath);
    
    try {
      const stateFileContent = await readFile(sessionFilepath, 'utf-8');
      sessionState = JSON.parse(stateFileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const errorMessage = `Session state file not found: ${sessionFilepath}\nThis suggests the delegating manager state machine hasn't been properly initialized.`;
        
        // Try to log session file not found error
        try {
          if (sessionManager.sessionExists(sessionId)) {
            await sessionManager.logValidationFailure(sessionId, 'file_not_found', errorMessage);
          }
        } catch (logError) {
          // Ignore logging errors for non-existent sessions
        }
        
        throw new Error(errorMessage);
      } else if (error instanceof SyntaxError) {
        const errorMessage = `Session file is corrupt (invalid JSON): ${sessionFilepath}\nTo recover: Edit session file manually, fix JSON, and set state to 'OVERRIDE'\nOVERRIDE mode bypasses all validations for remainder of session.\nParse error: ${error.message}`;
        
        // Try to log JSON parse error - this will likely fail but we try anyway
        try {
          await sessionManager.logValidationFailure(sessionId, 'json_parse_error', errorMessage);
        } catch (logError) {
          // Ignore logging errors for corrupt sessions
        }
        
        throw new Error(errorMessage);
      } else {
        const errorMessage = `Failed to read session state file: ${error.message}\nFile path: ${sessionFilepath}`;
        
        try {
          if (sessionManager.sessionExists(sessionId)) {
            await sessionManager.logValidationFailure(sessionId, 'file_read_error', errorMessage);
          }
        } catch (logError) {
          // Ignore logging errors
        }
        
        throw new Error(errorMessage);
      }
    }

    // Check for OVERRIDE state - bypass all validation
    if (sessionState.state === 'OVERRIDE' || sessionState.current_state === 'OVERRIDE') {
      console.log(`🔄 OVERRIDE mode detected - bypassing all plugin validations for session ${sessionFilepath}`);
      return true;
    }

    // Validate current state matches
    if (sessionState.current_state !== state) {
      const errorMessage = `State mismatch!\nMessage header state: "${state}"\nCurrent session state: "${sessionState.current_state}"\nSession file: ${sessionFilepath}\n\nThis suggests the message is using an outdated or incorrect state. The agent should call request_next_state to transition properly.`;
      
      // Log state mismatch failure
      try {
        await sessionManager.logValidationFailure(sessionId, 'state_mismatch', 
          `Message header state: ${state}, Current session state: ${sessionState.current_state}`,
          sessionState.current_state, state);
      } catch (logError) {
        console.warn(`Failed to log validation failure: ${logError.message}`);
      }
      
      throw new Error(errorMessage);
    }

    // Validate state_id matches
    if (sessionState.state_id !== stateId) {
      const errorMessage = `State ID mismatch!\nMessage header state_id: "${stateId}"\nCurrent session state_id: "${sessionState.state_id}"\nSession file: ${sessionFilepath}\n\nThis suggests the message is using an outdated state_id. The agent should use the current state_id from the session.`;
      
      // Log state ID mismatch failure
      try {
        await sessionManager.logValidationFailure(sessionId, 'state_id_mismatch', 
          `Message header state_id: ${stateId}, Current session state_id: ${sessionState.state_id}`);
      } catch (logError) {
        console.warn(`Failed to log validation failure: ${logError.message}`);
      }
      
      throw new Error(errorMessage);
    }

    console.log(`✅ Message header validation passed: ${state} (${stateId}) for session ${sessionFilepath}`);
    return true;
  };

  /**
   * Perform validation logic for final agent messages only
   */
  const performValidation = async (agentName, message, context, hookName) => {
    // Skip validation for non-delegating manager agents
    if (!isDelegatingManagerAgent(agentName)) {
      console.log(`🔍 [${hookName}] Skipping validation for agent: ${agentName} (not a delegating manager)`);
      return;
    }

    // Skip empty messages
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log(`🔍 [${hookName}] Skipping validation - no message content`);
      return;
    }

    // Skip messages that don't look like final responses (no JSON header)
    const firstLine = message.split('\n')[0]?.trim();
    if (!firstLine || !firstLine.startsWith('{')) {
      console.log(`🔍 [${hookName}] Skipping validation - not a structured response`);
      return;
    }

    console.log(`🔍 [${hookName}] Validating delegating manager response from agent: ${agentName}`);

    try {
      // Validate message header
      const { state, stateId, sessionFilepath } = validateMessageHeader(message);

      // Validate against current session state
      await validateAgainstSessionState(state, stateId, sessionFilepath);

    } catch (error) {
      console.error(`❌ [${hookName}] Delegating Manager Validation FAILED: ${error.message}`);
      throw error; // Re-throw to block invalid messages
    }
  };

  return {
    // ONLY hook into agent response - NOT tool calls or message sends
    'agent.response.after': async (input, output) => {
      const agentName = input.agent || input.agentName || 'unknown';
      const message = output.message || output.content || output.response || '';

      await performValidation(agentName, message, input.context || input, 'agent.response.after');
    },

    // Log session events for debugging
    'event': async ({ event }) => {
      if (event.type === 'session.start') {
        console.log('🚀 Delegating Manager Validator (Production): Session started');
      }
      if (event.type === 'session.end') {
        console.log('🏁 Delegating Manager Validator (Production): Session ended');
      }
    }
  };
};
