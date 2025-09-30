import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { homedir } from 'os';
import type { Session, ValidationFailure, TransitionFailure } from './types.js';

// Type for LowDB instance with Session data
type SessionDB = Low<Session | null>;

// Uses ~/.local/share/opencode/sessions
function getDefaultSessionsDir(): string {
  const home = homedir();
  return join(home, '.local', 'share', 'opencode', 'sessions');
}

// Generates date-based session ID with format: "2025-09-07-11-29-14-a1b2c3"
function generateDateBasedSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  return `${date}-${random}`;
}

// Session Manager using LowDB for persistent JSON storage
export class SessionManager {
  private readonly sessionsDir: string;
  private readonly sessions: Map<string, SessionDB>;

  constructor() {
    this.sessionsDir = getDefaultSessionsDir();
    this.sessions = new Map(); // Cache for loaded sessions

    // Ensure sessions directory exists
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  public _getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`);
  }

  private async _getSessionDB(sessionId: string): Promise<SessionDB> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    const filePath = this._getSessionPath(sessionId);
    const adapter = new JSONFileSync(filePath) as any;
    const db = new Low(adapter, null) as SessionDB;

    // Read the database data
    await db.read();
    this.sessions.set(sessionId, db);

    return db;
  }

  // Creates a new session with default data structure. Generates UUID if sessionId is null.
  async createSession(sessionId: string | null = null): Promise<Session> {
    try {
      const id = sessionId || generateDateBasedSessionId();

      // Check if session already exists
      if (await this.sessionExists(id)) {
        throw new Error(`Session ${id} already exists`);
      }

      const now = new Date().toISOString();
      const sessionData: Session = {
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
      throw new Error(`Failed to create session: ${(error as Error).message}`);
    }
  }

  async loadSession(sessionId: string): Promise<Session> {
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
      throw new Error(`Failed to load session ${sessionId}: ${(error as Error).message}`);
    }
  }

  async updateSession(sessionId: string, data: Partial<Session>): Promise<Session> {
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
      const updatedData: Session = {
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
      throw new Error(`Failed to update session ${sessionId}: ${(error as Error).message}`);
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
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

  // Logs validation failure to session state for metrics and debugging
  async logValidationFailure(
    sessionId: string,
    type: string,
    details: string,
    expectedState: string | null = null,
    attemptedState: string | null = null
  ): Promise<Session> {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const failureRecord: ValidationFailure = {
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
      throw new Error(`Failed to log validation failure: ${(error as Error).message}`);
    }
  }

  // Logs transition failure to session state for metrics and debugging
  async logTransitionFailure(
    sessionId: string,
    type: string,
    details: string,
    attemptedTransition: string | null = null
  ): Promise<Session> {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const failureRecord: TransitionFailure = {
        timestamp: new Date().toISOString(),
        type,
        details,
        ...(attemptedTransition && { attempted_transition: attemptedTransition })
      };

      const sessionData = await this.loadSession(sessionId);
      const transitionFailures = [...(sessionData.transition_failures || []), failureRecord];

      return await this.updateSession(sessionId, { transition_failures: transitionFailures });
    } catch (error) {
      throw new Error(`Failed to log transition failure: ${(error as Error).message}`);
    }
  }

  // Clear the session cache (useful for testing)
  clearCache(): void {
    this.sessions.clear();
  }
}

export default SessionManager;