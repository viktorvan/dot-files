import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { join, dirname } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { homedir } from 'os';
import { SessionManager } from '../../lib/session';
import { request_new_session, request_next_state, rollback_state, get_current_state } from '../../tool/session';
import { start_task, finish_task, task_add, task_read } from '../../tool/task';
import { submit_review } from '../../tool/review';
import { plan_add, plan_read } from '../../tool/plan';
import { review_review_plan_add, review_review_plan_read, review_review_implementation_add, review_review_implementation_read } from '../../tool/review';
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
        clarifying_answers_text: 'The system needs to handle user authentication and data storage. Analysis approved.'
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
          clarifying_answers_text: 'Need authentication system and analysis approved.'
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
          clarifying_answers_text: 'User management and data analytics dashboard. Analysis approved.'
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
          clarifying_answers_text: 'We need a user management system with authentication and data analytics dashboard. Analysis approved.'
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

  describe('Plan Tool Integration', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);
      sessionId = response.session_id;
      sessionPath = response.session;
    });

    test('plan_add saves XML plan to file', async () => {
      const planXml = `<?xml version="1.0" encoding="UTF-8"?>
<plan xmlns="http://medoma.com/opencode/plan">
  <session_id>${sessionId}</session_id>
  <summary>
    <user_request>Implement user authentication system</user_request>
  </summary>
  <current_system_analysis>
    <existing_implementation>
      <key_component>Basic user model exists</key_component>
    </existing_implementation>
  </current_system_analysis>
  <proposed_changes>
    <strategy_and_rationale>Add JWT authentication</strategy_and_rationale>
    <expected_impact>Secure user access</expected_impact>
  </proposed_changes>
  <file_changes>
    <add>
      <path>auth.js</path>
      <description>Add authentication module</description>
    </add>
  </file_changes>
  <testing_strategy>
    <unit_tests>Test login/logout functions</unit_tests>
  </testing_strategy>
  <verification_criteria>
    <manual_check>
      <api_endpoint>POST /login</api_endpoint>
    </manual_check>
  </verification_criteria>
</plan>`;

      const result = await plan_add.execute({
        session_id: sessionId,
        plan_xml: planXml
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Plan XML saved to');

      // Verify the plan XML was saved to the file in the same directory as session
      const sessionPath = sessionManager._getSessionPath(sessionId);
      const sessionDir = dirname(sessionPath);
      const planFilePath = join(sessionDir, `${sessionId}_plan.xml`);
      expect(existsSync(planFilePath)).toBe(true);
      const fileContent = readFileSync(planFilePath, 'utf-8');
      expect(fileContent).toBe(planXml);
    });

    test('plan_read retrieves stored XML plan', async () => {
      const planXml = `<?xml version="1.0" encoding="UTF-8"?>
<plan xmlns="http://medoma.com/opencode/plan">
  <session_id>${sessionId}</session_id>
  <summary>
    <user_request>Build dashboard</user_request>
  </summary>
  <current_system_analysis>
    <existing_implementation>
      <architecture_pattern>MVC pattern</architecture_pattern>
    </existing_implementation>
  </current_system_analysis>
  <proposed_changes>
    <strategy_and_rationale>Add dashboard components</strategy_and_rationale>
    <expected_impact>Better UX</expected_impact>
  </proposed_changes>
  <file_changes>
    <modify>
      <path>dashboard.html</path>
      <description>Update dashboard layout</description>
    </modify>
  </file_changes>
  <testing_strategy>
    <integration_tests>Test dashboard loading</integration_tests>
  </testing_strategy>
  <verification_criteria>
    <manual_check>
      <business_rule>Dashboard displays data correctly</business_rule>
    </manual_check>
  </verification_criteria>
</plan>`;

      // First add the plan
      await plan_add.execute({
        session_id: sessionId,
        plan_xml: planXml
      }, {} as any);

      // Now read it back
      const result = await plan_read.execute({
        session_id: sessionId
      }, {} as any);

      expect(result).toBe(planXml);
    });

    test('plan_add validates XML structure', async () => {
      // Test invalid XML (missing closing tag)
      const invalidXml = `<plan><summary><user_request>Test</user_request></summary>`;

      await expect(plan_add.execute({
        session_id: sessionId,
        plan_xml: invalidXml
      }, {} as any)).rejects.toThrow(/Invalid XML/);
    });

    test('plan_add validates XML against XSD schema', async () => {
      // Test XML missing required session_id element
      const invalidSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<plan xmlns="http://medoma.com/opencode/plan">
  <summary>
    <user_request>Test request</user_request>
  </summary>
  <current_system_analysis>
    <existing_implementation>
      <key_component>Test component</key_component>
    </existing_implementation>
  </current_system_analysis>
  <proposed_changes>
    <strategy_and_rationale>Test strategy</strategy_and_rationale>
    <expected_impact>Test impact</expected_impact>
  </proposed_changes>
  <file_changes>
    <add>
      <path>test.js</path>
      <description>Test file</description>
    </add>
  </file_changes>
  <testing_strategy>
    <unit_tests>Test units</unit_tests>
  </testing_strategy>
  <verification_criteria>
    <manual_check>
      <api_endpoint>POST /test</api_endpoint>
    </manual_check>
  </verification_criteria>
</plan>`;

      await expect(plan_add.execute({
        session_id: sessionId,
        plan_xml: invalidSchemaXml
      }, {} as any)).rejects.toThrow(/Schema validation failed/);
    });

    test('plan_add accepts valid XML conforming to XSD schema', async () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<plan xmlns="http://medoma.com/opencode/plan">
  <session_id>${sessionId}</session_id>
  <summary>
    <user_request>Test request</user_request>
  </summary>
  <current_system_analysis>
    <existing_implementation>
      <key_component>Test component</key_component>
    </existing_implementation>
  </current_system_analysis>
  <proposed_changes>
    <strategy_and_rationale>Test strategy</strategy_and_rationale>
    <expected_impact>Test impact</expected_impact>
  </proposed_changes>
  <file_changes>
    <add>
      <path>test.js</path>
      <description>Test file</description>
    </add>
  </file_changes>
  <testing_strategy>
    <unit_tests>Test units</unit_tests>
  </testing_strategy>
  <verification_criteria>
    <manual_check>
      <api_endpoint>POST /test</api_endpoint>
    </manual_check>
  </verification_criteria>
</plan>`;

      const result = await plan_add.execute({
        session_id: sessionId,
        plan_xml: validXml
      }, {} as any);

      const response = JSON.parse(result);
      expect(response.success).toBe(true);
    });

    test('plan_read validates stored XML against XSD schema', async () => {
      // First add a valid plan
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<plan xmlns="http://medoma.com/opencode/plan">
  <session_id>${sessionId}</session_id>
  <summary>
    <user_request>Read test request</user_request>
  </summary>
  <current_system_analysis>
    <existing_implementation>
      <architecture_pattern>Test pattern</architecture_pattern>
    </existing_implementation>
  </current_system_analysis>
  <proposed_changes>
    <strategy_and_rationale>Read test strategy</strategy_and_rationale>
    <expected_impact>Read test impact</expected_impact>
  </proposed_changes>
  <file_changes>
    <modify>
      <path>readtest.js</path>
      <description>Modify test file</description>
    </modify>
  </file_changes>
  <testing_strategy>
    <integration_tests>Read test integration</integration_tests>
  </testing_strategy>
  <verification_criteria>
    <manual_check>
      <business_rule>Read test rule</business_rule>
    </manual_check>
  </verification_criteria>
</plan>`;

      await plan_add.execute({
        session_id: sessionId,
        plan_xml: validXml
      }, {} as any);

      // Now read it back - should validate and return
      const result = await plan_read.execute({
        session_id: sessionId
      }, {} as any);

      expect(result).toBe(validXml);
    });

    test('plan_read fails when no plan exists', async () => {
      await expect(plan_read.execute({
        session_id: sessionId
      }, {} as any)).rejects.toThrow(/no such file or directory/);
    });

    test('plan_add and plan_read fail with invalid session_id', async () => {
      const planXml = `<plan><summary><user_request>Test</user_request></summary></plan>`;

      await expect(plan_add.execute({
        session_id: 'non-existent-session',
        plan_xml: planXml
      }, {} as any)).rejects.toThrow(/not found/);

      await expect(plan_read.execute({
        session_id: 'non-existent-session'
      }, {} as any)).rejects.toThrow(/not found/);
    });
  });

  describe('New Consistently Named Tools Integration', () => {
    let sessionId: string;
    let sessionPath: string;

    beforeEach(async () => {
      // Create a session for each test
      const result = await request_new_session.execute({}, {} as any);
      const response = JSON.parse(result);
      sessionId = response.session_id;
      sessionPath = response.session;
    });

    describe('review_review_plan_add and review_review_plan_read', () => {
      test('review_review_plan_add saves XML plan review to file', async () => {
        const reviewPlanXml = `<?xml version="1.0" encoding="UTF-8"?>
<review xmlns="http://medoma.com/opencode/review">
  <review_id>test-review-123</review_id>
  <session_id>${sessionId}</session_id>
  <plan_analysis>
    <technical_approach>JWT-based authentication with middleware pattern</technical_approach>
    <design_decisions>Using bcrypt for password hashing</design_decisions>
    <best_practices_alignment>Follows OAuth 2.0 principles</best_practices_alignment>
    <improvements>Add rate limiting and session management</improvements>
  </plan_analysis>
  <risks>
    <implementation_risk>Password policy enforcement complexity</implementation_risk>
    <performance_risk>Database query optimization needed</performance_risk>
  </risks>
  <completeness_verification>
    <plan_format_compliance>All required sections present</plan_format_compliance>
    <user_request_coverage>Authentication requirements fully addressed</user_request_coverage>
    <file_changes_accuracy>File modifications clearly specified</file_changes_accuracy>
    <testing_strategy_coverage>Unit and integration tests planned</testing_strategy_coverage>
  </completeness_verification>
  <final_assessment>
    <status>NEEDS_REVISION</status>
    <summary>Good plan but needs rate limiting and session management details</summary>
  </final_assessment>
</review>`;

        const result = await review_review_plan_add.execute({
          session_id: sessionId,
          plan_xml: reviewPlanXml
        }, {} as any);

        const response = JSON.parse(result);
        expect(response.success).toBe(true);
        expect(response.message).toContain('Review plan XML saved to');

        // Verify the review plan XML was saved to the file in the same directory as session
        const sessionPath = sessionManager._getSessionPath(sessionId);
        const sessionDir = dirname(sessionPath);
        const reviewPlanFilePath = join(sessionDir, `${sessionId}_plan_review.xml`);
        expect(existsSync(reviewPlanFilePath)).toBe(true);
        const fileContent = readFileSync(reviewPlanFilePath, 'utf-8');
        expect(fileContent).toBe(reviewPlanXml);
      });

      test('review_review_plan_read retrieves stored XML review plan', async () => {
        const reviewPlanXml = `<?xml version="1.0" encoding="UTF-8"?>
<review xmlns="http://medoma.com/opencode/review">
  <review_id>test-review-456</review_id>
  <session_id>${sessionId}</session_id>
  <plan_analysis>
    <technical_approach>Component-based dashboard with React</technical_approach>
    <design_decisions>Using CSS Grid for responsive layout</design_decisions>
    <best_practices_alignment>Follows React best practices</best_practices_alignment>
    <improvements>Add lazy loading for performance</improvements>
  </plan_analysis>
  <risks>
    <performance_risk>Large data sets may cause rendering delays</performance_risk>
  </risks>
  <completeness_verification>
    <plan_format_compliance>All sections properly formatted</plan_format_compliance>
    <user_request_coverage>Dashboard requirements fully covered</user_request_coverage>
    <file_changes_accuracy>Component files clearly specified</file_changes_accuracy>
    <testing_strategy_coverage>Component testing strategy defined</testing_strategy_coverage>
  </completeness_verification>
  <final_assessment>
    <status>APPROVED</status>
    <summary>Well-designed dashboard plan ready for implementation</summary>
  </final_assessment>
</review>`;

        // First add the review plan
        await review_review_plan_add.execute({
          session_id: sessionId,
          plan_xml: reviewPlanXml
        }, {} as any);

        // Now read it back
        const result = await review_review_plan_read.execute({
          session_id: sessionId
        }, {} as any);

        expect(result).toBe(reviewPlanXml);
      });

      test('review_review_plan_add validates XML structure', async () => {
        // Test invalid XML (missing closing tag)
        const invalidXml = `<review_plan><review_summary><original_plan_summary>Test</original_plan_summary></review_summary>`;

        await expect(review_review_plan_add.execute({
          session_id: sessionId,
          plan_xml: invalidXml
        }, {} as any)).rejects.toThrow(/Invalid XML/);
      });

      test('review_review_plan_read fails when no review plan exists', async () => {
        await expect(review_review_plan_read.execute({
          session_id: sessionId
        }, {} as any)).rejects.toThrow(/no such file or directory/);
      });
    });

    describe('review_review_implementation_add and review_review_implementation_read', () => {
      test('review_review_implementation_add saves XML implementation review to file', async () => {
        const reviewImplXml = `<?xml version="1.0" encoding="UTF-8"?>
<implementation_review xmlns="http://medoma.com/opencode/review-implementation">
  <review_id>impl-review-123</review_id>
  <session_id>${sessionId}</session_id>
  <implementation_analysis>
    <plan_adherence>Implementation follows the approved plan closely</plan_adherence>
    <file_changes_verification>All planned file changes completed correctly</file_changes_verification>
    <deviations>Added extra validation helper function</deviations>
    <code_quality_assessment>Code quality is high with good test coverage</code_quality_assessment>
  </implementation_analysis>
  <definition_of_done_verification>
    <subtask_verification>
      <task_id>auth_implementation</task_id>
      <command_result>
        <command>npm test</command>
        <exit_code>0</exit_code>
        <stdout>All tests passed</stdout>
      </command_result>
      <success_criteria_met>true</success_criteria_met>
    </subtask_verification>
  </definition_of_done_verification>
  <risks_and_issues>
    <integration_risk>Session timeout configuration needs review</integration_risk>
    <testing_gap>Edge case validation could be improved</testing_gap>
  </risks_and_issues>
  <final_assessment>
    <status>APPROVED</status>
    <summary>Implementation is solid and ready for deployment</summary>
  </final_assessment>
</implementation_review>`;

        const result = await review_review_implementation_add.execute({
          session_id: sessionId,
          plan_xml: reviewImplXml
        }, {} as any);

        const response = JSON.parse(result);
        expect(response.success).toBe(true);
        expect(response.message).toContain('Review implementation XML saved to');

        // Verify the review implementation XML was saved to the file in the same directory as session
        const sessionPath = sessionManager._getSessionPath(sessionId);
        const sessionDir = dirname(sessionPath);
        const reviewImplFilePath = join(sessionDir, `${sessionId}_implementation_review.xml`);
        expect(existsSync(reviewImplFilePath)).toBe(true);
        const fileContent = readFileSync(reviewImplFilePath, 'utf-8');
        expect(fileContent).toBe(reviewImplXml);
      });

      test('review_review_implementation_read retrieves stored XML implementation review', async () => {
        const reviewImplXml = `<?xml version="1.0" encoding="UTF-8"?>
<implementation_review xmlns="http://medoma.com/opencode/review-implementation">
  <review_id>impl-review-456</review_id>
  <session_id>${sessionId}</session_id>
  <implementation_analysis>
    <plan_adherence>Dashboard implementation matches approved design</plan_adherence>
    <file_changes_verification>All component files created as specified</file_changes_verification>
    <code_quality_assessment>High quality modular code with good performance</code_quality_assessment>
  </implementation_analysis>
  <definition_of_done_verification>
    <subtask_verification>
      <task_id>dashboard_implementation</task_id>
      <command_result>
        <command>npm run build</command>
        <exit_code>0</exit_code>
        <stdout>Build successful</stdout>
      </command_result>
      <success_criteria_met>true</success_criteria_met>
    </subtask_verification>
  </definition_of_done_verification>
  <risks_and_issues>
    <performance_risk>Large data sets may need optimization</performance_risk>
  </risks_and_issues>
  <final_assessment>
    <status>APPROVED</status>
    <summary>Dashboard implementation is production ready</summary>
  </final_assessment>
</implementation_review>`;

        // First add the implementation review
        await review_review_implementation_add.execute({
          session_id: sessionId,
          plan_xml: reviewImplXml
        }, {} as any);

        // Now read it back
        const result = await review_review_implementation_read.execute({
          session_id: sessionId
        }, {} as any);

        expect(result).toBe(reviewImplXml);
      });

      test('review_review_implementation_add validates XML structure', async () => {
        // Test invalid XML (missing closing tag)
        const invalidXml = `<review_implementation><review_summary><implementation_scope>Test</implementation_scope></review_summary>`;

        await expect(review_review_implementation_add.execute({
          session_id: sessionId,
          plan_xml: invalidXml
        }, {} as any)).rejects.toThrow(/Invalid XML/);
      });

      test('review_review_implementation_read fails when no implementation review exists', async () => {
        await expect(review_review_implementation_read.execute({
          session_id: sessionId
        }, {} as any)).rejects.toThrow(/no such file or directory/);
      });
    });

    describe('task_add and task_read with new consistently named interface', () => {
      test('task_add saves XML task to file and task_read retrieves it', async () => {
        const taskId = 'test_implementation_task';
        const taskXml = `<?xml version="1.0" encoding="UTF-8"?>
<task_delegation xmlns="http://medoma.com/opencode/task-delegation">
  <title>Implement user authentication</title>
  <task_id>${taskId}</task_id>
  <session_id>${sessionId}</session_id>
  <task>
    <goal>Implement secure user authentication system</goal>
  </task>
  <context>
    <repo_paths>
      <path>./src/auth</path>
      <path>./src/models/user.js</path>
    </repo_paths>
    <background>Need to add JWT-based authentication with proper security measures</background>
  </context>
  <expected_outcome>
    <behavior>Users can securely log in and access protected resources</behavior>
    <artifacts>
      <artifact>Authentication middleware</artifact>
      <artifact>User login/logout endpoints</artifact>
      <artifact>JWT token management</artifact>
    </artifacts>
  </expected_outcome>
  <definition_of_done>
    <build>npm run build</build>
    <tests>npm test</tests>
  </definition_of_done>
  <timebox>10m</timebox>
  <rules_and_output>
    <rule>Follow security best practices</rule>
    <rule>Implement proper error handling</rule>
    <rule>Add comprehensive tests</rule>
  </rules_and_output>
</task_delegation>`;

        // Add the task
        const addResult = await task_add.execute({
          session_id: sessionId,
          task_id: taskId,
          task_xml: taskXml
        }, {} as any);

        const addResponse = JSON.parse(addResult);
        expect(addResponse.success).toBe(true);
        expect(addResponse.message).toContain('Task XML saved to');

        // Verify the task XML was saved to the file in the same directory as session
        const sessionPath = sessionManager._getSessionPath(sessionId);
        const sessionDir = dirname(sessionPath);
        const taskFilePath = join(sessionDir, `${sessionId}_${taskId}.xml`);
        expect(existsSync(taskFilePath)).toBe(true);
        const fileContent = readFileSync(taskFilePath, 'utf-8');
        expect(fileContent).toBe(taskXml);

        // Now read it back
        const readResult = await task_read.execute({
          session_id: sessionId,
          task_id: taskId
        }, {} as any);

        expect(readResult).toBe(taskXml);
      });

      test('task_add handles task_id sanitization (hyphens to underscores)', async () => {
        const taskIdWithHyphens = 'test-auth-task';
        const expectedTaskId = 'test_auth_task';
        const taskXml = `<?xml version="1.0" encoding="UTF-8"?>
<task_delegation xmlns="http://medoma.com/opencode/task-delegation">
  <title>Test authentication task</title>
  <task_id>${expectedTaskId}</task_id>
  <session_id>${sessionId}</session_id>
  <task>
    <goal>Test goal</goal>
  </task>
  <context>
    <repo_paths>
      <path>./test</path>
    </repo_paths>
    <background>Test background</background>
  </context>
  <expected_outcome>
    <behavior>Test behavior</behavior>
    <artifacts>
      <artifact>Test artifact</artifact>
    </artifacts>
  </expected_outcome>
  <definition_of_done>
    <build>npm test</build>
    <tests>npm test</tests>
  </definition_of_done>
  <timebox>5m</timebox>
  <rules_and_output>
    <rule>Test rule</rule>
  </rules_and_output>
</task_delegation>`;

        // Add task with hyphens in ID
        await task_add.execute({
          session_id: sessionId,
          task_id: taskIdWithHyphens,
          task_xml: taskXml
        }, {} as any);

        // Verify file was created with underscores
        const sessionPath = sessionManager._getSessionPath(sessionId);
        const sessionDir = dirname(sessionPath);
        const taskFilePath = join(sessionDir, `${sessionId}_${expectedTaskId}.xml`);
        expect(existsSync(taskFilePath)).toBe(true);

        // Read using original hyphenated ID should work
        const result = await task_read.execute({
          session_id: sessionId,
          task_id: taskIdWithHyphens
        }, {} as any);

        expect(result).toBe(taskXml);
      });

      test('task_add validates XML structure', async () => {
        // Test invalid XML (missing closing tag)
        const invalidXml = `<task_delegation><title>Test</title><task_id>test</task_id>`;

        await expect(task_add.execute({
          session_id: sessionId,
          task_id: 'test_task',
          task_xml: invalidXml
        }, {} as any)).rejects.toThrow(/Invalid XML/);
      });

      test('task_read fails when no task exists', async () => {
        await expect(task_read.execute({
          session_id: sessionId,
          task_id: 'non_existent_task'
        }, {} as any)).rejects.toThrow(/no such file or directory/);
      });

      test('task tools fail with invalid session_id', async () => {
        const taskXml = `<task_delegation><title>Test</title></task_delegation>`;

        await expect(task_add.execute({
          session_id: 'non-existent-session',
          task_id: 'test_task',
          task_xml: taskXml
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(task_read.execute({
          session_id: 'non-existent-session',
          task_id: 'test_task'
        }, {} as any)).rejects.toThrow(/not found/);
      });
    });

    describe('XML Validation Integration', () => {
      test('all new tools properly validate XML against their schemas', async () => {
        // Test that XML validation is working for all new tools by attempting
        // to add valid XML that should pass basic parsing but fail schema validation

        const basicValidXml = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <session_id>${sessionId}</session_id>
  <title>Valid XML but wrong schema</title>
</root>`;

        // All these should fail schema validation
        await expect(review_review_plan_add.execute({
          session_id: sessionId,
          plan_xml: basicValidXml
        }, {} as any)).rejects.toThrow(/Schema validation failed/);

        await expect(review_review_implementation_add.execute({
          session_id: sessionId,
          plan_xml: basicValidXml
        }, {} as any)).rejects.toThrow(/Schema validation failed/);

        await expect(task_add.execute({
          session_id: sessionId,
          task_id: 'test_task',
          task_xml: basicValidXml
        }, {} as any)).rejects.toThrow(/Schema validation failed/);
      });
    });

    describe('Error Handling and File Integrity for New Tools', () => {
      test('new tool failures do not corrupt session files', async () => {
        // Get initial session state
        const initialContent = readFileSync(sessionPath, 'utf-8');
        const initialData = JSON.parse(initialContent);

        // Try operations that should fail
        await expect(review_review_plan_add.execute({
          session_id: sessionId,
          plan_xml: '<invalid>'
        }, {} as any)).rejects.toThrow();

        await expect(review_review_implementation_add.execute({
          session_id: sessionId,
          plan_xml: '<invalid>'
        }, {} as any)).rejects.toThrow();

        await expect(task_add.execute({
          session_id: sessionId,
          task_id: 'test_task',
          task_xml: '<invalid>'
        }, {} as any)).rejects.toThrow();

        // Verify session file is unchanged after failed operations
        const finalContent = readFileSync(sessionPath, 'utf-8');
        const finalData = JSON.parse(finalContent);
        expect(finalData).toEqual(initialData);
      });

      test('new tools operations on non-existent session fail gracefully', async () => {
        const nonExistentSessionId = 'non-existent-session-id';
        const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<test><session_id>${nonExistentSessionId}</session_id></test>`;

        await expect(review_review_plan_add.execute({
          session_id: nonExistentSessionId,
          plan_xml: validXml
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(review_review_plan_read.execute({
          session_id: nonExistentSessionId
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(review_review_implementation_add.execute({
          session_id: nonExistentSessionId,
          plan_xml: validXml
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(review_review_implementation_read.execute({
          session_id: nonExistentSessionId
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(task_add.execute({
          session_id: nonExistentSessionId,
          task_id: 'test_task',
          task_xml: validXml
        }, {} as any)).rejects.toThrow(/not found/);

        await expect(task_read.execute({
          session_id: nonExistentSessionId,
          task_id: 'test_task'
        }, {} as any)).rejects.toThrow(/not found/);
      });
    });
  });
});
