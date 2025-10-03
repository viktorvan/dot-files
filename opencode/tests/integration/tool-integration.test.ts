import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { SessionManager } from '../../lib/session';
import { request_new_session, request_next_state, rollback_state, get_current_state } from '../../tool/session';
import { start_task, finish_task } from '../../tool/task';
import { submit_review } from '../../tool/review';
import type { Session } from '../../lib/types';

// Test directory for isolated session files
const TEST_SESSIONS_DIR = join(homedir(), '.local', 'share', 'opencode', 'sessions-test');

describe('Tool Integration Tests', () => {
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

  describe('Session Creation and File Persistence', () => {
    test('request_new_session creates actual session file on disk', async () => {
      // Execute the tool
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);

      // Verify response structure
      expect(response.approved).toBe(true);
      expect(response.state).toBe('ANALYSIS');
      expect(response.session_id).toBeDefined();
      expect(response.state_id).toBeDefined();
      expect(response.session).toBeDefined();

      // Verify session file actually exists on disk
      const sessionPath = response.session;
      expect(existsSync(sessionPath)).toBe(true);

      // Verify session file contains correct data
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.session_id).toBe(response.session_id);
      expect(sessionData.current_state).toBe('ANALYSIS');
      expect(sessionData.state_id).toBe(response.state_id);
      expect(sessionData.assigned_tasks).toEqual({});
      expect(Array.isArray(sessionData.state_history)).toBe(true);
      expect(sessionData.state_history).toHaveLength(0);
    });

    test('multiple session creations create separate files', async () => {
      // Create first session
      const result1 = await request_new_session.execute({}, {} as any);
      const response1 = JSON.parse(result1);

      // Create second session
      const result2 = await request_new_session.execute({}, {} as any);
      const response2 = JSON.parse(result2);

      // Verify different session IDs
      expect(response1.session_id).not.toBe(response2.session_id);

      // Verify both files exist
      expect(existsSync(response1.session)).toBe(true);
      expect(existsSync(response2.session)).toBe(true);

      // Verify files have different content
      const session1Data = JSON.parse(readFileSync(response1.session, 'utf-8'));
      const session2Data = JSON.parse(readFileSync(response2.session, 'utf-8'));

      expect(session1Data.session_id).toBe(response1.session_id);
      expect(session2Data.session_id).toBe(response2.session_id);
    });
  });

  describe('State Transition and File Updates', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);
      sessionId = response.session_id;
      sessionPath = response.session;
    });

    test('request_next_state actually updates session file on disk', async () => {
      // Transition from ANALYSIS to PLAN
      const evidence = {
        clarifying_questions_text: 'What are the main requirements?',
        clarifying_answers_text: 'The system needs to handle user authentication and data storage.'
      };

      const result = await request_next_state.execute({
        session_id: sessionId,
        evidence,
        notes: 'Moving to planning phase'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.approved).toBe(true);
      expect(response.state).toBe('PLAN');

      // Verify file was actually updated on disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.current_state).toBe('PLAN');
      expect(sessionData.state_id).toBe(response.state_id);
      expect(sessionData.state_history).toHaveLength(1);

      const transitionRecord = sessionData.state_history[0];
      expect(transitionRecord).toBeDefined();
      expect(transitionRecord!.from_state).toBe('ANALYSIS');
      expect(transitionRecord!.to_state).toBe('PLAN');
      expect(transitionRecord!.evidence).toEqual(evidence);
      expect(transitionRecord!.notes).toBe('Moving to planning phase');
      expect(transitionRecord!.timestamp).toBeDefined();
    });

    test('state transition validation prevents invalid transitions', async () => {
      // Try to transition without required evidence
      await expect(request_next_state.execute({
        session_id: sessionId,
        evidence: {}
      }, {} as any)).rejects.toThrow(/Missing required fields/);

      // Verify file was not corrupted and still in original state
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;
      expect(sessionData.current_state).toBe('ANALYSIS');
      expect(sessionData.state_history).toHaveLength(0);
    });

    test('rollback_state updates session file correctly', async () => {
      // First, advance through a few states
      await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What are the requirements?',
          clarifying_answers_text: 'Need authentication system.'
        }
      }, {} as any);

      await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          plan_summary: 'Implement authentication with JWT tokens and user management.'
        }
      }, {} as any);

      // Verify we're in REVIEW_PLAN state
      let fileContent = readFileSync(sessionPath, 'utf-8');
      let sessionData = JSON.parse(fileContent) as Session;
      expect(sessionData.current_state).toBe('REVIEW_PLAN');

      // Rollback to ANALYSIS
      const result = await rollback_state.execute({
        session_id: sessionId,
        target_state: 'ANALYSIS',
        notes: 'Need to revisit requirements'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.approved).toBe(true);
      expect(response.state).toBe('ANALYSIS');

      // Verify file was updated on disk
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.current_state).toBe('ANALYSIS');
      expect(sessionData.state_id).toBe(response.state_id);
      expect(sessionData.state_history).toHaveLength(3); // 2 forward + 1 rollback

      const rollbackRecord = sessionData.state_history[2];
      expect(rollbackRecord).toBeDefined();
      expect(rollbackRecord!.from_state).toBe('REVIEW_PLAN');
      expect(rollbackRecord!.to_state).toBe('ANALYSIS');
      expect(rollbackRecord!.transition_type).toBe('rollback');
      expect(rollbackRecord!.notes).toBe('Need to revisit requirements');
    });
  });

  describe('Task Management and File Updates', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);
      sessionId = response.session_id;
      sessionPath = response.session;
    });

    test('start_task creates task record in session file', async () => {
      const taskId = 'test_task_123';

      const result = await start_task.execute({
        session_id: sessionId,
        task_id: taskId
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.task_id).toBe(taskId);

      // Verify task was added to session file on disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.assigned_tasks).toHaveProperty(taskId);
      const task = sessionData.assigned_tasks[taskId];
      expect(task).toBeDefined();
      expect(task!.task_id).toBe(taskId);
      expect(task!.status).toBe('started');
      expect(task!.started_at).toBeDefined();
      expect(new Date(task!.started_at).getTime()).toBeCloseTo(Date.now(), -1000);
    });

    test('finish_task updates task status in session file', async () => {
      const taskId = 'test_task_456';

      // Start the task first
      await start_task.execute({
        session_id: sessionId,
        task_id: taskId
      }, {} as any);

      // Finish the task
      const result = await finish_task.execute({
        session_id: sessionId,
        task_id: taskId,
        status: 'COMPLETED'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.status).toBe('COMPLETED');

      // Verify task status was updated in session file on disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      const task = sessionData.assigned_tasks[taskId];
      expect(task).toBeDefined();
      expect(task!.status).toBe('completed');
      expect(task!.finished_at).toBeDefined();
      expect(new Date(task!.finished_at).getTime()).toBeCloseTo(Date.now(), -1000);
    });

    test('task ID sanitization (hyphens to underscores) works correctly', async () => {
      const taskIdWithHyphens = 'test-task-with-hyphens';
      const expectedTaskId = 'test_task_with_hyphens';

      // Start task with hyphens
      await start_task.execute({
        session_id: sessionId,
        task_id: taskIdWithHyphens
      }, {} as any);

      // Verify task is stored with underscores
      let fileContent = readFileSync(sessionPath, 'utf-8');
      let sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.assigned_tasks).toHaveProperty(expectedTaskId);
      expect(sessionData.assigned_tasks).not.toHaveProperty(taskIdWithHyphens);

      // Finish task using original hyphenated ID
      await finish_task.execute({
        session_id: sessionId,
        task_id: taskIdWithHyphens,
        status: 'COMPLETED'
      }, {} as any);

      // Verify task is still accessible and updated
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;

      const task = sessionData.assigned_tasks[expectedTaskId];
      expect(task).toBeDefined();
      expect(task!.status).toBe('completed');
      expect(task!.finished_at).toBeDefined();
    });
  });

  describe('End-to-End Workflow Tests', () => {
    test('complete session workflow with file persistence at each step', async () => {
      // Step 1: Create session
      const sessionResult = await request_new_session.execute({}, {} as any);
      const sessionResponse = JSON.parse(sessionResult);
      const sessionId = sessionResponse.session_id;
      const sessionPath = sessionResponse.session;

      // Step 2: Move to PLAN state
      await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What features are needed?',
          clarifying_answers_text: 'User management and data analytics dashboard.'
        }
      }, {} as any);

      // Verify PLAN state persisted
      let fileContent = readFileSync(sessionPath, 'utf-8');
      let sessionData = JSON.parse(fileContent) as Session;
      expect(sessionData.current_state).toBe('PLAN');

      // Step 3: Move to REVIEW_PLAN state
      await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          plan_summary: 'Comprehensive plan for user management system with analytics.'
        }
      }, {} as any);

      // Verify REVIEW_PLAN state persisted
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;
      expect(sessionData.current_state).toBe('REVIEW_PLAN');

      // Step 4: Start multiple tasks
      const taskIds = ['user_auth_task', 'analytics_task', 'dashboard_task'];
      for (const taskId of taskIds) {
        await start_task.execute({
          session_id: sessionId,
          task_id: taskId
        }, {} as any);
      }

      // Verify all tasks persisted
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;
      
      for (const taskId of taskIds) {
        expect(sessionData.assigned_tasks).toHaveProperty(taskId);
        expect(sessionData.assigned_tasks[taskId]).toBeDefined();
        expect(sessionData.assigned_tasks[taskId]!.status).toBe('started');
      }

      // Step 5: Complete tasks
      for (const taskId of taskIds) {
        await finish_task.execute({
          session_id: sessionId,
          task_id: taskId,
          status: 'COMPLETED'
        }, {} as any);
      }

      // Verify all task completions persisted
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;
      
      for (const taskId of taskIds) {
        expect(sessionData.assigned_tasks[taskId]).toBeDefined();
        expect(sessionData.assigned_tasks[taskId]!.status).toBe('completed');
        expect(sessionData.assigned_tasks[taskId]!.finished_at).toBeDefined();
      }

      // Step 6: Verify get_current_state returns correct info
      const stateResult = await get_current_state.execute({
        session_id: sessionId
      }, {} as any);
      
      const stateResponse = JSON.parse(stateResult);
      expect(stateResponse.current_state).toBe('REVIEW_PLAN');
      expect(stateResponse.state_id).toBeDefined();
      expect(stateResponse.session).toBe(sessionPath);

      // Final verification: Check complete session state history
      fileContent = readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent) as Session;
      
      expect(sessionData.state_history).toHaveLength(2);
      expect(sessionData.state_history[0]).toBeDefined();
      expect(sessionData.state_history[0]!.from_state).toBe('ANALYSIS');
      expect(sessionData.state_history[0]!.to_state).toBe('PLAN');
      expect(sessionData.state_history[1]).toBeDefined();
      expect(sessionData.state_history[1]!.from_state).toBe('PLAN');
      expect(sessionData.state_history[1]!.to_state).toBe('REVIEW_PLAN');
    });

    test('complete state machine progression from ANALYSIS to DONE', async () => {
      // Step 1: Create new session (starts in ANALYSIS state)
      const sessionResult = await request_new_session.execute({}, {} as any);
      const sessionResponse = JSON.parse(sessionResult);
      const sessionId = sessionResponse.session_id;
      const sessionPath = sessionResponse.session;

      expect(sessionResponse.approved).toBe(true);
      expect(sessionResponse.state).toBe('ANALYSIS');

      // Step 2: ANALYSIS -> PLAN
      const planResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What are the main requirements for this system?',
          clarifying_answers_text: 'We need a user management system with authentication and data analytics dashboard.'
        },
        notes: 'Analysis completed, moving to planning phase'
      }, {} as any);

      const planResponse = JSON.parse(planResult);
      expect(planResponse.approved).toBe(true);
      expect(planResponse.state).toBe('PLAN');

      // Step 3: PLAN -> REVIEW_PLAN  
      const reviewPlanResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          plan_summary: 'Comprehensive plan to implement user authentication with JWT tokens, role-based access control, and a data analytics dashboard with real-time metrics visualization.'
        },
        notes: 'Plan completed, ready for review'
      }, {} as any);

      const reviewPlanResponse = JSON.parse(reviewPlanResult);
      expect(reviewPlanResponse.approved).toBe(true);
      expect(reviewPlanResponse.state).toBe('REVIEW_PLAN');

      // Step 4: Submit plan review (required for REVIEW_PLAN -> USER_APPROVAL transition)
      const planReviewResult = await submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'APPROVED'
      }, {} as any);

      const planReviewResponse = JSON.parse(planReviewResult);
      expect(planReviewResponse.success).toBe(true);
      const planReviewId = planReviewResponse.review_id;

      // Step 5: REVIEW_PLAN -> USER_APPROVAL
      const userApprovalResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          review_id: planReviewId
        },
        notes: 'Plan review completed, requesting user approval'
      }, {} as any);

      const userApprovalResponse = JSON.parse(userApprovalResult);
      expect(userApprovalResponse.approved).toBe(true);
      expect(userApprovalResponse.state).toBe('USER_APPROVAL');

      // Step 6: USER_APPROVAL -> DELEGATION
      const delegationResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          user_approval_text: 'Yes I approve this plan to proceed with implementation.'
        },
        notes: 'User approval received, moving to delegation'
      }, {} as any);

      const delegationResponse = JSON.parse(delegationResult);
      expect(delegationResponse.approved).toBe(true);
      expect(delegationResponse.state).toBe('DELEGATION');

      // Step 7: Start and complete tasks (required for DELEGATION -> REVIEW_IMPLEMENTATION)
      const taskIds = ['auth_implementation', 'dashboard_implementation', 'analytics_implementation'];
      
      for (const taskId of taskIds) {
        await start_task.execute({
          session_id: sessionId,
          task_id: taskId
        }, {} as any);
      }

      for (const taskId of taskIds) {
        await finish_task.execute({
          session_id: sessionId,
          task_id: taskId,
          status: 'COMPLETED'
        }, {} as any);
      }

      // Step 8: DELEGATION -> REVIEW_IMPLEMENTATION
      const reviewImplResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          task_ids: taskIds
        },
        notes: 'All tasks completed, ready for implementation review'
      }, {} as any);

      const reviewImplResponse = JSON.parse(reviewImplResult);
      expect(reviewImplResponse.approved).toBe(true);
      expect(reviewImplResponse.state).toBe('REVIEW_IMPLEMENTATION');

      // Step 9: Submit implementation review (required for REVIEW_IMPLEMENTATION -> DONE)
      const implReviewResult = await submit_review.execute({
        session_id: sessionId,
        review_type: 'IMPLEMENTATION',
        verdict: 'APPROVED'
      }, {} as any);

      const implReviewResponse = JSON.parse(implReviewResult);
      expect(implReviewResponse.success).toBe(true);
      const implReviewId = implReviewResponse.review_id;

      // Step 10: REVIEW_IMPLEMENTATION -> DONE
      const doneResult = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          review_id: implReviewId
        },
        notes: 'Implementation review completed, project finished'
      }, {} as any);

      const doneResponse = JSON.parse(doneResult);
      expect(doneResponse.approved).toBe(true);
      expect(doneResponse.state).toBe('DONE');

      // Final verification: Check that session file reflects DONE state
      const finalContent = readFileSync(sessionPath, 'utf-8');
      const finalSessionData = JSON.parse(finalContent) as Session;
      
      expect(finalSessionData.current_state).toBe('DONE');
      expect(finalSessionData.state_history).toHaveLength(6); // All 6 transitions
      expect(finalSessionData.plan_review_id).toBe(planReviewId);
      expect(finalSessionData.implementation_review_id).toBe(implReviewId);
      expect(Object.keys(finalSessionData.assigned_tasks)).toHaveLength(3);
      
      // Verify all tasks are completed
      for (const taskId of taskIds) {
        expect(finalSessionData.assigned_tasks[taskId]).toBeDefined();
        expect(finalSessionData.assigned_tasks[taskId]!.status).toBe('completed');
      }
    });
  });

  describe('Error Handling and File Integrity', () => {
    test('tool failures do not corrupt session files', async () => {
      // Create session
      const sessionResult = await request_new_session.execute({}, {} as any);
      const sessionResponse = JSON.parse(sessionResult);
      const sessionId = sessionResponse.session_id;
      const sessionPath = sessionResponse.session;

      // Get initial file content
      const initialContent = readFileSync(sessionPath, 'utf-8');
      const initialData = JSON.parse(initialContent) as Session;

      // Try invalid operations that should fail
      await expect(request_next_state.execute({
        session_id: sessionId,
        evidence: { invalid_field: 'invalid_value' }
      }, {} as any)).rejects.toThrow();

      await expect(start_task.execute({
        session_id: sessionId,
        task_id: ''
      }, {} as any)).rejects.toThrow();

      await expect(finish_task.execute({
        session_id: sessionId,
        task_id: 'non_existent_task',
        status: 'COMPLETED'
      }, {} as any)).rejects.toThrow();

      // Verify file is unchanged after failed operations
      const finalContent = readFileSync(sessionPath, 'utf-8');
      const finalData = JSON.parse(finalContent) as Session;

      expect(finalData.current_state).toBe(initialData.current_state);
      expect(finalData.state_id).toBe(initialData.state_id);
      expect(finalData.state_history).toEqual(initialData.state_history);
      expect(finalData.assigned_tasks).toEqual(initialData.assigned_tasks);
    });

    test('operations on non-existent session fail gracefully', async () => {
      const nonExistentSessionId = 'non-existent-session-id';

      await expect(request_next_state.execute({
        session_id: nonExistentSessionId,
        evidence: {}
      }, {} as any)).rejects.toThrow(/not found/);

      await expect(start_task.execute({
        session_id: nonExistentSessionId,
        task_id: 'test_task'
      }, {} as any)).rejects.toThrow(/not found/);

      await expect(get_current_state.execute({
        session_id: nonExistentSessionId
      }, {} as any)).rejects.toThrow(/not found/);
    });
  });

  describe('Review Tool Integration', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);
      sessionId = response.session_id;
      sessionPath = response.session;
    });

    test('submit_review for PLAN creates review_id and persists to session file', async () => {
      // Submit a plan review
      const result = await submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'APPROVED'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.review_id).toBeDefined();
      expect(response.review_type).toBe('PLAN');
      expect(response.verdict).toBe('APPROVED');
      expect(response.session).toBe(sessionPath);

      // Verify the plan_review_id was actually persisted to the session file on disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(response.review_id);
      expect(sessionData.plan_review_state).toBe('APPROVED');
    });

    test('submit_review for IMPLEMENTATION creates review_id and persists to session file', async () => {
      // Submit an implementation review
      const result = await submit_review.execute({
        session_id: sessionId,
        review_type: 'IMPLEMENTATION',
        verdict: 'REJECTED'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.review_id).toBeDefined();
      expect(response.review_type).toBe('IMPLEMENTATION');
      expect(response.verdict).toBe('REJECTED');

      // Verify the implementation_review_id was actually persisted to the session file on disk
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.implementation_review_id).toBe(response.review_id);
      expect(sessionData.implementation_review_state).toBe('REJECTED');
    });

    test('submit_review generates unique UUIDs for different reviews', async () => {
      // Submit first plan review
      const result1 = await submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'NEEDS_REVISION'
      }, {} as any);

      const response1 = JSON.parse(result1);

      // Submit implementation review
      const result2 = await submit_review.execute({
        session_id: sessionId,
        review_type: 'IMPLEMENTATION',
        verdict: 'APPROVED'
      }, {} as any);

      const response2 = JSON.parse(result2);

      // Verify different UUIDs were generated
      expect(response1.review_id).not.toBe(response2.review_id);

      // Verify both reviews were persisted with different IDs
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(response1.review_id);
      expect(sessionData.plan_review_state).toBe('NEEDS_REVISION');
      expect(sessionData.implementation_review_id).toBe(response2.review_id);
      expect(sessionData.implementation_review_state).toBe('APPROVED');
    });

    test('submit_review overwrites previous review of same type', async () => {
      // Submit first plan review
      const result1 = await submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'NEEDS_REVISION'
      }, {} as any);

      const response1 = JSON.parse(result1);

      // Submit second plan review (should overwrite)
      const result2 = await submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'APPROVED'
      }, {} as any);

      const response2 = JSON.parse(result2);

      // Verify different review IDs
      expect(response1.review_id).not.toBe(response2.review_id);

      // Verify only the latest review is persisted
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(response2.review_id);
      expect(sessionData.plan_review_state).toBe('APPROVED');
      expect(sessionData.plan_review_id).not.toBe(response1.review_id);
    });

    test('submit_review fails with invalid session_id', async () => {
      await expect(submit_review.execute({
        session_id: 'non-existent-session',
        review_type: 'PLAN',
        verdict: 'APPROVED'
      }, {} as any)).rejects.toThrow(/not found/);
    });

    test('submit_review validates review_type parameter', async () => {
      await expect(submit_review.execute({
        session_id: sessionId,
        review_type: 'INVALID_TYPE',
        verdict: 'APPROVED'
      }, {} as any)).rejects.toThrow(/Invalid review_type: INVALID_TYPE/);
    });

    test('submit_review validates verdict parameter', async () => {
      await expect(submit_review.execute({
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'INVALID_VERDICT'
      }, {} as any)).rejects.toThrow(/Invalid verdict: INVALID_VERDICT/);
    });

    test('submit_review handles case-insensitive review_type and verdict', async () => {
      const result = await submit_review.execute({
        session_id: sessionId,
        review_type: 'plan',
        verdict: 'approved'
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.review_type).toBe('PLAN');
      expect(response.verdict).toBe('APPROVED');

      // Verify it was persisted correctly
      const fileContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(fileContent) as Session;

      expect(sessionData.plan_review_id).toBe(response.review_id);
      expect(sessionData.plan_review_state).toBe('APPROVED');
    });
  });
});
