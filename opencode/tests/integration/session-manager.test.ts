import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { SessionManager } from '../../lib/session.js';
import type { Session, TaskStatus } from '../../lib/types.js';

// Test directory for isolated session files
const TEST_SESSIONS_DIR = join(homedir(), '.local', 'share', 'opencode', 'sessions-test-sm');

describe('SessionManager Integration Tests', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Clear any existing test directory
    if (existsSync(TEST_SESSIONS_DIR)) {
      rmSync(TEST_SESSIONS_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_SESSIONS_DIR, { recursive: true });

    // Initialize session manager
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    // Clean up test session files
    if (existsSync(TEST_SESSIONS_DIR)) {
      rmSync(TEST_SESSIONS_DIR, { recursive: true, force: true });
    }
  });

  describe('updateSession function integration tests', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const session = await sessionManager.createSession();
      sessionId = session.session_id;
      sessionPath = sessionManager._getSessionPath(sessionId);
    });

    test('updateSession persists plan_review_id to disk correctly', async () => {
      const reviewId = 'plan-review-12345';

      // Update the session with plan_review_id
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: reviewId
      });

      // Verify return value
      expect(updatedSession.plan_review_id).toBe(reviewId);
      expect(updatedSession.session_id).toBe(sessionId);
      expect(updatedSession.updated_at).toBeDefined();

      // Verify persistence to disk
      expect(existsSync(sessionPath)).toBe(true);
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(reviewId);
      expect(sessionData.session_id).toBe(sessionId);
      expect(sessionData.updated_at).toBe(updatedSession.updated_at);
    });

    test('updateSession persists implementation_review_id to disk correctly', async () => {
      const reviewId = 'impl-review-67890';

      // Update the session with implementation_review_id
      const updatedSession = await sessionManager.updateSession(sessionId, {
        implementation_review_id: reviewId
      });

      // Verify return value
      expect(updatedSession.implementation_review_id).toBe(reviewId);
      expect(updatedSession.session_id).toBe(sessionId);

      // Verify persistence to disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.implementation_review_id).toBe(reviewId);
      expect(sessionData.session_id).toBe(sessionId);
    });

    test('updateSession can update multiple fields simultaneously', async () => {
      const planReviewId = 'plan-abc123';
      const implReviewId = 'impl-xyz789';
      const newState = 'DONE';

      // Update multiple fields at once
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: planReviewId,
        implementation_review_id: implReviewId,
        current_state: newState
      });

      // Verify return value has all updates
      expect(updatedSession.plan_review_id).toBe(planReviewId);
      expect(updatedSession.implementation_review_id).toBe(implReviewId);
      expect(updatedSession.current_state).toBe(newState);

      // Verify all changes persisted to disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(planReviewId);
      expect(sessionData.implementation_review_id).toBe(implReviewId);
      expect(sessionData.current_state).toBe(newState);
    });

    test('updateSession can clear review IDs by setting them to null', async () => {
      // First set some review IDs
      await sessionManager.updateSession(sessionId, {
        plan_review_id: 'temp-plan-id',
        implementation_review_id: 'temp-impl-id'
      });

      // Clear them by setting to null
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: null,
        implementation_review_id: null
      });

      // Verify return value
      expect(updatedSession.plan_review_id).toBeNull();
      expect(updatedSession.implementation_review_id).toBeNull();

      // Verify disk persistence
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBeNull();
      expect(sessionData.implementation_review_id).toBeNull();
    });

    test('updateSession preserves session_id even if included in update data', async () => {
      const originalSessionId = sessionId;
      const maliciousSessionId = 'hacked-session-id';

      // Try to update session_id (should be ignored)
      const updatedSession = await sessionManager.updateSession(sessionId, {
        session_id: maliciousSessionId,
        plan_review_id: 'test-review'
      });

      // Verify session_id was preserved
      expect(updatedSession.session_id).toBe(originalSessionId);
      expect(updatedSession.session_id).not.toBe(maliciousSessionId);

      // Verify persistence
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.session_id).toBe(originalSessionId);
      expect(sessionData.plan_review_id).toBe('test-review');
    });

    test('updateSession always updates the updated_at timestamp', async () => {
      const originalSession = await sessionManager.loadSession(sessionId);
      const originalTimestamp = originalSession.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update the session
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: 'new-review-id'
      });

      // Verify timestamp was updated
      expect(updatedSession.updated_at).not.toBe(originalTimestamp);
      expect(new Date(updatedSession.updated_at).getTime()).toBeGreaterThan(
        new Date(originalTimestamp).getTime()
      );

      // Verify persistence
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.updated_at).toBe(updatedSession.updated_at);
    });

    test('updateSession preserves existing fields not included in update', async () => {
      const originalSession = await sessionManager.loadSession(sessionId);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update only plan_review_id
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: 'preserve-test-review'
      });

      // Verify all original fields preserved except updated_at
      expect(updatedSession.current_state).toBe(originalSession.current_state);
      expect(updatedSession.state_id).toBe(originalSession.state_id);
      expect(updatedSession.created_at).toBe(originalSession.created_at);
      expect(updatedSession.state_history).toEqual(originalSession.state_history);
      expect(updatedSession.assigned_tasks).toEqual(originalSession.assigned_tasks);
      expect(updatedSession.implementation_review_id).toBe(originalSession.implementation_review_id);
      expect(updatedSession.validation_failures).toEqual(originalSession.validation_failures);
      expect(updatedSession.transition_failures).toEqual(originalSession.transition_failures);

      // Only these should be different
      expect(updatedSession.plan_review_id).toBe('preserve-test-review');
      expect(updatedSession.updated_at).not.toBe(originalSession.updated_at);
    });

    test('updateSession works with complex nested data structures', async () => {
      const complexTaskData = {
        'task_1': {
          status: 'completed' as TaskStatus,
          started_at: '2025-01-01T10:00:00Z',
          finished_at: '2025-01-01T11:00:00Z',
          metadata: { complexity: 'high', priority: 'urgent' }
        },
        'task_2': {
          status: 'started' as TaskStatus,
          started_at: '2025-01-01T11:30:00Z'
        }
      };

      const validationFailure = {
        timestamp: '2025-01-01T12:00:00Z',
        type: 'state_validation_error',
        details: 'Invalid state transition attempted',
        expected_state: 'PLAN',
        attempted_state: 'DONE'
      };

      // Update with complex data
      const updatedSession = await sessionManager.updateSession(sessionId, {
        assigned_tasks: complexTaskData,
        validation_failures: [validationFailure],
        plan_review_id: 'complex-review-123'
      });

      // Verify complex data in return value
      expect(updatedSession.assigned_tasks).toEqual(complexTaskData);
      expect(updatedSession.validation_failures).toEqual([validationFailure]);
      expect(updatedSession.plan_review_id).toBe('complex-review-123');

      // Verify complex data persisted to disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.assigned_tasks).toEqual(complexTaskData);
      expect(sessionData.validation_failures).toEqual([validationFailure]);
      expect(sessionData.plan_review_id).toBe('complex-review-123');

      // Verify nested object structure is preserved
      expect(sessionData.assigned_tasks['task_1']!.metadata).toEqual({ 
        complexity: 'high', 
        priority: 'urgent' 
      });
    });

    test('updateSession fails gracefully with non-existent session', async () => {
      const nonExistentSessionId = 'non-existent-session-123';

      await expect(sessionManager.updateSession(nonExistentSessionId, {
        plan_review_id: 'should-fail'
      })).rejects.toThrow(/Session non-existent-session-123 not found/);
    });

    test('updateSession validates input parameters correctly', async () => {
      // Test with empty session ID
      await expect(sessionManager.updateSession('', {
        plan_review_id: 'test'
      })).rejects.toThrow(/Session ID is required/);

      // Test with null data
      await expect(sessionManager.updateSession(sessionId, null as any)).rejects.toThrow(/Update data must be a valid object/);

      // Test with undefined data
      await expect(sessionManager.updateSession(sessionId, undefined as any)).rejects.toThrow(/Update data must be a valid object/);

      // Test with non-object data
      await expect(sessionManager.updateSession(sessionId, 'string' as any)).rejects.toThrow(/Update data must be a valid object/);

      // Empty object should work (no-op update)
      const result = await sessionManager.updateSession(sessionId, {});
      expect(result).toBeDefined();
      expect(result.session_id).toBe(sessionId);
    });

    test('updateSession handles concurrent updates correctly', async () => {
      // Simulate concurrent updates
      const update1Promise = sessionManager.updateSession(sessionId, {
        plan_review_id: 'concurrent-review-1'
      });

      const update2Promise = sessionManager.updateSession(sessionId, {
        implementation_review_id: 'concurrent-review-2'
      });

      const [result1, result2] = await Promise.all([update1Promise, update2Promise]);

      // Both should succeed
      expect(result1.plan_review_id).toBe('concurrent-review-1');
      expect(result2.implementation_review_id).toBe('concurrent-review-2');

      // Final state should have both updates (one of them will win)
      const finalSession = await sessionManager.loadSession(sessionId);
      
      // At least one of the updates should be present
      const hasReview1 = finalSession.plan_review_id === 'concurrent-review-1';
      const hasReview2 = finalSession.implementation_review_id === 'concurrent-review-2';
      
      expect(hasReview1 || hasReview2).toBe(true);
    });

    test('updateSession with review states works correctly', async () => {
      // Update with review states (additional fields beyond what's in base Session interface)
      const updatedSession = await sessionManager.updateSession(sessionId, {
        plan_review_id: 'review-state-test',
        plan_review_state: 'APPROVED',
        implementation_review_id: 'impl-state-test',
        implementation_review_state: 'REJECTED'
      });

      // Verify return value includes extra fields
      expect(updatedSession.plan_review_id).toBe('review-state-test');
      expect((updatedSession as any).plan_review_state).toBe('APPROVED');
      expect(updatedSession.implementation_review_id).toBe('impl-state-test');
      expect((updatedSession as any).implementation_review_state).toBe('REJECTED');

      // Verify persistence includes extra fields
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as any;

      expect(sessionData.plan_review_id).toBe('review-state-test');
      expect(sessionData.plan_review_state).toBe('APPROVED');
      expect(sessionData.implementation_review_id).toBe('impl-state-test');
      expect(sessionData.implementation_review_state).toBe('REJECTED');
    });
  });

  describe('SessionManager persistence behavior', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionManager.createSession();
      sessionId = session.session_id;
    });

    test('updateSession maintains consistency across multiple updates', async () => {
      // First update
      const update1 = await sessionManager.updateSession(sessionId, {
        plan_review_id: 'persistence-test-1'
      });

      // Second update
      const update2 = await sessionManager.updateSession(sessionId, {
        implementation_review_id: 'persistence-test-2'
      });

      // Both review IDs should be present in final result
      expect(update2.plan_review_id).toBe('persistence-test-1');
      expect(update2.implementation_review_id).toBe('persistence-test-2');

      // Reload to verify persistence
      const reloaded = await sessionManager.loadSession(sessionId);

      expect(reloaded.plan_review_id).toBe('persistence-test-1');
      expect(reloaded.implementation_review_id).toBe('persistence-test-2');
    });

    test('session state is correctly maintained across multiple operations', async () => {
      // Multiple updates
      await sessionManager.updateSession(sessionId, { plan_review_id: 'step1' });
      await sessionManager.updateSession(sessionId, { implementation_review_id: 'step2' });
      await sessionManager.updateSession(sessionId, { current_state: 'DONE' });

      // Load session from disk
      const loaded = await sessionManager.loadSession(sessionId);

      expect(loaded.plan_review_id).toBe('step1');
      expect(loaded.implementation_review_id).toBe('step2');
      expect(loaded.current_state).toBe('DONE');

      // Verify disk data matches
      const sessionPath = sessionManager._getSessionPath(sessionId);
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const diskData = JSON.parse(fileContent) as Session;

      expect(diskData.plan_review_id).toBe('step1');
      expect(diskData.implementation_review_id).toBe('step2');
      expect(diskData.current_state).toBe('DONE');
    });
  });
});
