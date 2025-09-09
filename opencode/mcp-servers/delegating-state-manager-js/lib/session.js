import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { homedir } from 'os';

/**
 * Get the default sessions directory path
 * Uses ~/.local/share/opencode/sessions
 */
function getDefaultSessionsDir() {
  const home = homedir();
  return join(home, '.local', 'share', 'opencode', 'sessions');
}

/**
 * Generate a date-based session ID with format: "2025-09-07-11-29-14-a1b2c3"
 */
function generateDateBasedSessionId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  return `${date}-${random}`;
}

/**
 * Session Manager using LowDB for persistent JSON storage
 * Provides simple CRUD operations for session management
 */
export class SessionManager {
  constructor() {
    this.sessionsDir = getDefaultSessionsDir();
    this.sessions = new Map(); // Cache for loaded sessions

    // Ensure sessions directory exists
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a session
   * @param {string} sessionId - Session identifier
   * @returns {string} Full path to session file
   */
  _getSessionPath(sessionId) {
    return join(this.sessionsDir, `${sessionId}.json`);
  }

   /**
    * Load or create a LowDB instance for a session
    * @param {string} sessionId - Session identifier
    * @returns {Promise<Low>} LowDB instance
    */
  async _getSessionDB(sessionId) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const filePath = this._getSessionPath(sessionId);
    const adapter = new JSONFileSync(filePath);
    const db = new Low(adapter, null);

    await db.read();
    this.sessions.set(sessionId, db);

    return db;
  }

  /**
    * Create a new session with default data structure
    * @param {string|null} sessionId - Optional session ID, generates UUID if null
    * @returns {Promise<Object>} Created session data
    */
  async createSession(sessionId = null) {
    try {
      const id = sessionId || generateDateBasedSessionId();

      // Check if session already exists
      if (await this.sessionExists(id)) {
        throw new Error(`Session ${id} already exists`);
      }

      const now = new Date().toISOString();
      const sessionData = {
        session_id: id,
        current_state: 'ANALYSIS',
        state_id: randomUUID(),
        state_history: [],
        created_at: now,
        updated_at: now,
        assigned_tasks: {},
        plan_review_id: null,
        implementation_review_id: null,
        validation_failures: [],
        transition_failures: []
      };

      const db = await this._getSessionDB(id);
      db.data = sessionData;
      await db.write();

      // Verify that the file was actually created on disk
      const filePath = this._getSessionPath(id);
      if (!existsSync(filePath)) {
        throw new Error(`Failed to create session file: ${filePath}`);
      }

      return sessionData;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
    * Load an existing session
    * @param {string} sessionId - Session identifier
    * @returns {Promise<Object>} Session data
    */
  async loadSession(sessionId) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const db = await this._getSessionDB(sessionId);

      if (!db.data) {
        throw new Error(`Session ${sessionId} not found`);
      }

      return db.data;
    } catch (error) {
      throw new Error(`Failed to load session ${sessionId}: ${error.message}`);
    }
  }

  /**
    * Update session data
    * @param {string} sessionId - Session identifier
    * @param {Object} data - Partial session data to update
    * @returns {Promise<Object>} Updated session data
    */
  async updateSession(sessionId, data) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Update data must be a valid object');
      }

      const db = await this._getSessionDB(sessionId);

      if (!db.data) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Update the session data with new values
      const updatedData = {
        ...db.data,
        ...data,
        updated_at: new Date().toISOString()
      };

      // Ensure session_id cannot be changed
      updatedData.session_id = sessionId;

      db.data = updatedData;
      await db.write();

      return updatedData;
    } catch (error) {
      throw new Error(`Failed to update session ${sessionId}: ${error.message}`);
    }
  }

  /**
    * Check if a session exists
    * @param {string} sessionId - Session identifier
    * @returns {Promise<boolean>} True if session exists
    */
  async sessionExists(sessionId) {
    try {
      if (!sessionId) {
        return false;
      }

      const filePath = this._getSessionPath(sessionId);
      if (!existsSync(filePath)) {
        return false;
      }

      // Try to load the session to ensure it's valid
      const db = await this._getSessionDB(sessionId);
      await db.read();

      return db.data !== null && typeof db.data === 'object';
    } catch (error) {
      // If there's an error reading the session, consider it non-existent
      return false;
    }
  }

  /**
   * Log validation failure to session state for metrics and debugging
   * @param {string} sessionId - Session identifier
   * @param {string} type - Type of validation failure (e.g., 'state_mismatch', 'invalid_format')
   * @param {string} details - Detailed description of the failure
   * @param {string} expectedState - Expected state (optional)
   * @param {string} attemptedState - Attempted state (optional)
   * @returns {Object} Updated session data
   */
  async logValidationFailure(sessionId, type, details, expectedState = null, attemptedState = null) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const failureRecord = {
        timestamp: new Date().toISOString(),
        type,
        details,
        ...(expectedState && { expected_state: expectedState }),
        ...(attemptedState && { attempted_state: attemptedState })
      };

      const sessionData = await this.loadSession(sessionId);
      const validationFailures = [...(sessionData.validation_failures || []), failureRecord];

      return await this.updateSession(sessionId, { validation_failures: validationFailures });
    } catch (error) {
      throw new Error(`Failed to log validation failure: ${error.message}`);
    }
  }

  /**
   * Log transition failure to session state for metrics and debugging
   * @param {string} sessionId - Session identifier
   * @param {string} type - Type of transition failure (e.g., 'missing_evidence', 'validation_error', 'invalid_transition')
   * @param {string} details - Detailed description of the failure
   * @param {string} attemptedTransition - Attempted transition (e.g., 'ANALYSIS -> PLAN')
   * @returns {Object} Updated session data
   */
  async logTransitionFailure(sessionId, type, details, attemptedTransition = null) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const failureRecord = {
        timestamp: new Date().toISOString(),
        type,
        details,
        ...(attemptedTransition && { attempted_transition: attemptedTransition })
      };

      const sessionData = await this.loadSession(sessionId);
      const transitionFailures = [...(sessionData.transition_failures || []), failureRecord];

      return await this.updateSession(sessionId, { transition_failures: transitionFailures });
    } catch (error) {
      throw new Error(`Failed to log transition failure: ${error.message}`);
    }
  }

  /**
   * Clear the session cache (useful for testing)
   */
  clearCache() {
    this.sessions.clear();
  }
}

export default SessionManager;
