/**
 * Comprehensive Audit Logging Tests
 * Tests that verify session files are properly updated with audit logging on validation errors and request_next_state failures
 */

import { MCPTestClient, createNewSession, completeWorkflowToDelegation } from './helpers.js';
import { SessionManager } from '../lib/session.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Comprehensive Audit Logging Tests', () => {
  let client;
  let sessionManager;

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.startServer();
    
    // Initialize session manager with same path as server
    sessionManager = new SessionManager();
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
    // Clear session cache to force reload from disk
    if (sessionManager) {
      sessionManager.clearCache();
    }
  });

  describe('Validation Failure Logging Tests', () => {
    test('should log validation failures with proper categorization and timestamps', async () => {
      const sessionId = await createNewSession(client);

      // Log different types of validation failures manually
      await sessionManager.logValidationFailure(
        sessionId,
        'state_mismatch',
        'Expected state ANALYSIS but found PLAN in message header',
        'ANALYSIS',
        'PLAN'
      );

      await sessionManager.logValidationFailure(
        sessionId,
        'invalid_format',
        'Evidence field must be string but got number',
        null,
        null
      );

      await sessionManager.logValidationFailure(
        sessionId,
        'missing_header',
        'Required message header field session_id is missing'
      );

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 100));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      // Verify all validation failures are logged
      expect(sessionData.validation_failures).toBeDefined();
      expect(sessionData.validation_failures.length).toBeGreaterThanOrEqual(3);

      // Verify first validation failure (state_mismatch)
      const stateMismatchFailure = sessionData.validation_failures.find(f => f.type === 'state_mismatch');
      expect(stateMismatchFailure).toBeDefined();
      expect(stateMismatchFailure.details).toBe('Expected state ANALYSIS but found PLAN in message header');
      expect(stateMismatchFailure.expected_state).toBe('ANALYSIS');
      expect(stateMismatchFailure.attempted_state).toBe('PLAN');
      expect(stateMismatchFailure.timestamp).toBeDefined();
      expect(new Date(stateMismatchFailure.timestamp)).toBeInstanceOf(Date);

      // Verify second validation failure (invalid_format)
      const invalidFormatFailure = sessionData.validation_failures.find(f => f.type === 'invalid_format');
      expect(invalidFormatFailure).toBeDefined();
      expect(invalidFormatFailure.details).toBe('Evidence field must be string but got number');
      expect(invalidFormatFailure.expected_state).toBeUndefined();
      expect(invalidFormatFailure.attempted_state).toBeUndefined();

      // Verify third validation failure (missing_header)
      const missingHeaderFailure = sessionData.validation_failures.find(f => f.type === 'missing_header');
      expect(missingHeaderFailure).toBeDefined();
      expect(missingHeaderFailure.details).toBe('Required message header field session_id is missing');
    });

    test('should read session file directly to verify validation logging', async () => {
      const sessionId = await createNewSession(client);

      // Log a validation failure
      await sessionManager.logValidationFailure(
        sessionId,
        'test_failure',
        'This is a test validation failure',
        'ANALYSIS',
        'INVALID_STATE'
      );

      // Add delay to ensure file write completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Read session file directly from disk
      const sessionFilePath = sessionManager._getSessionPath(sessionId);
      const fileContent = await readFile(sessionFilePath, 'utf8');
      const sessionDataFromFile = JSON.parse(fileContent);

      // Verify the validation failure exists in the file
      expect(sessionDataFromFile.validation_failures).toBeDefined();
      expect(sessionDataFromFile.validation_failures.length).toBe(1);
      
      const failure = sessionDataFromFile.validation_failures[0];
      expect(failure.type).toBe('test_failure');
      expect(failure.details).toBe('This is a test validation failure');
      expect(failure.expected_state).toBe('ANALYSIS');
      expect(failure.attempted_state).toBe('INVALID_STATE');
      expect(failure.timestamp).toBeDefined();
    });
  });

  describe('Transition Failure Logging Tests', () => {
    test('should log missing evidence failures during request_next_state', async () => {
      const sessionId = await createNewSession(client);

      // Attempt transition without required evidence
      await expect(
        client.callTool('request_next_state', { 
          session_id: sessionId, 
          evidence: {} 
        })
      ).rejects.toThrow(/Missing required fields/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      expect(sessionData.transition_failures).toHaveLength(1);
      const failure = sessionData.transition_failures[0];
      
      expect(failure.type).toBe('missing_evidence');
      expect(failure.details).toContain('Missing required fields');
      expect(failure.details).toContain('clarifying_questions_text, clarifying_answers_text');
      expect(failure.attempted_transition).toBe('ANALYSIS -> PLAN');
      expect(failure.timestamp).toBeDefined();
      expect(new Date(failure.timestamp)).toBeInstanceOf(Date);
    });

    test('should log invalid evidence format failures', async () => {
      const sessionId = await createNewSession(client);

      // Attempt transition with invalid evidence format (too short)
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {
            clarifying_questions_text: 'x', // Too short (< 10 chars)
            clarifying_answers_text: 'Valid answer that is long enough for validation'
          }
        })
      ).rejects.toThrow(/must be at least/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      expect(sessionData.transition_failures).toHaveLength(1);
      const failure = sessionData.transition_failures[0];
      
      expect(failure.type).toBe('invalid_format');
      expect(failure.details).toContain('must be at least 10 characters long');
      expect(failure.attempted_transition).toBe('ANALYSIS -> PLAN');
      expect(failure.timestamp).toBeDefined();
    });

    test('should log invalid session reference failures', async () => {
      // Attempt transition with non-existent session_id
      await expect(
        client.callTool('request_next_state', {
          session_id: 'non-existent-session-id',
          evidence: {
            clarifying_questions_text: 'Valid question text',
            clarifying_answers_text: 'Valid answer text'
          }
        })
      ).rejects.toThrow(/not found/);

      // Cannot verify logging for non-existent session, but error should be thrown
    });

    test('should log terminal state transition attempts', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Complete workflow to DONE state
      const taskResult = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'terminal-test-task'
      });
      const taskId = JSON.parse(taskResult.content[0].text).task_id;
      
      await client.callTool('finish_task', {
        session_id: sessionId,
        task_id: taskId,
        status: 'COMPLETED'
      });

      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: { task_ids: [taskId] }
      });

      const implReviewResult = await client.callTool('submit_review', {
        session_id: sessionId,
        review_type: 'IMPLEMENTATION',
        verdict: 'APPROVED'
      });
      const implReviewId = JSON.parse(implReviewResult.content[0].text).review_id;

      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: { review_id: implReviewId }
      });

      // Now session should be in DONE state - attempt another transition
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {}
        })
      ).rejects.toThrow(/Cannot transition from state|already at final state/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const terminalFailure = sessionData.transition_failures.find(f => f.type === 'terminal_state');
      expect(terminalFailure).toBeDefined();
      expect(terminalFailure.details).toContain('already at final state');
      expect(terminalFailure.attempted_transition).toBe('DONE -> [terminal]');
      expect(terminalFailure.timestamp).toBeDefined();
    });
  });

  describe('Task Validation Failure Logging Tests', () => {
    test('should log non-existent task reference failures', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Attempt transition with non-existent task_id
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {
            task_ids: ['non-existent-task-12345']
          }
        })
      ).rejects.toThrow(/does not exist in session/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const taskFailure = sessionData.transition_failures.find(f => f.type === 'invalid_reference');
      expect(taskFailure).toBeDefined();
      expect(taskFailure.details).toContain('does not exist in session');
      expect(taskFailure.attempted_transition).toBe('DELEGATION -> REVIEW_IMPLEMENTATION');
    });

    test('should log task status validation failures for aborted tasks', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Start and abort a task
      const taskResult = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'aborted-task-test'
      });
      const taskId = JSON.parse(taskResult.content[0].text).task_id;

      await client.callTool('finish_task', {
        session_id: sessionId,
        task_id: taskId,
        status: 'ABORTED'
      });

      // Attempt transition with aborted task
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {
            task_ids: [taskId]
          }
        })
      ).rejects.toThrow(/aborted.*cannot be included/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const taskFailure = sessionData.transition_failures.find(f => f.type === 'task_status_error');
      expect(taskFailure).toBeDefined();
      expect(taskFailure.details).toContain('aborted');
      expect(taskFailure.details).toContain('cannot be included');
    });

    test('should log task status validation failures for started (unfinished) tasks', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Start a task but don't finish it
      const taskResult = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'started-unfinished-task'
      });
      const taskId = JSON.parse(taskResult.content[0].text).task_id;

      // Attempt transition with started but unfinished task
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {
            task_ids: [taskId]
          }
        })
      ).rejects.toThrow(/started.*must be completed/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const taskFailure = sessionData.transition_failures.find(f => f.type === 'task_status_error');
      expect(taskFailure).toBeDefined();
      expect(taskFailure.details).toContain('started');
      expect(taskFailure.details).toContain('must be completed');
    });

    test('should log orphaned task validation failures', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Start multiple tasks
      const task1Result = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'completed-task-included'
      });
      const task1Id = JSON.parse(task1Result.content[0].text).task_id;

      const task2Result = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'completed-task-orphaned'
      });
      const task2Id = JSON.parse(task2Result.content[0].text).task_id;

      // Complete both tasks
      await client.callTool('finish_task', {
        session_id: sessionId,
        task_id: task1Id,
        status: 'COMPLETED'
      });

      await client.callTool('finish_task', {
        session_id: sessionId,
        task_id: task2Id,
        status: 'COMPLETED'
      });

      // Attempt transition with only one completed task (leaving the other orphaned)
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: {
            task_ids: [task1Id] // Missing task2Id - should fail
          }
        })
      ).rejects.toThrow(/not included in evidence.*completed tasks must be included/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const taskFailure = sessionData.transition_failures.find(f => f.type === 'task_status_error');
      expect(taskFailure).toBeDefined();
      expect(taskFailure.details).toContain('not included in evidence');
      expect(taskFailure.details).toContain('completed tasks must be included');
    });
  });

  describe('Review Validation Failure Logging Tests', () => {
    test('should log review mismatch failures', async () => {
      const sessionId = await createNewSession(client);
      
      // Progress to REVIEW_PLAN state
      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What is the main objective?',
          clarifying_answers_text: 'Complete integration test workflow.'
        }
      });

      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: { plan_summary: 'Comprehensive integration test plan' }
      });

      // Submit plan review
      const planReviewResult = await client.callTool('submit_review', {
        session_id: sessionId,
        review_type: 'PLAN',
        verdict: 'APPROVED'
      });
      const correctReviewId = JSON.parse(planReviewResult.content[0].text).review_id;

      // Attempt transition with wrong review_id
      await expect(
        client.callTool('request_next_state', {
          session_id: sessionId,
          evidence: { review_id: 'wrong-review-id-12345' }
        })
      ).rejects.toThrow(/review_id does not match/);

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 200));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      const reviewFailure = sessionData.transition_failures.find(f => f.type === 'review_mismatch');
      expect(reviewFailure).toBeDefined();
      expect(reviewFailure.details).toContain('review_id does not match');
      expect(reviewFailure.attempted_transition).toBe('REVIEW_PLAN -> USER_APPROVAL');
    });
  });

  describe('Success Scenarios - No Failure Logging', () => {
    test('successful operations should not add failure logs', async () => {
      const sessionId = await createNewSession(client);

      // Perform successful transition
      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What is the main objective of this task?',
          clarifying_answers_text: 'The main objective is to create comprehensive integration tests.'
        },
        notes: 'Moving from analysis to planning phase'
      });

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 100));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      // Verify no failures were logged
      expect(sessionData.transition_failures).toHaveLength(0);
      expect(sessionData.validation_failures).toHaveLength(0);
      
      // Verify successful transition
      expect(sessionData.current_state).toBe('PLAN');
      expect(sessionData.state_history).toHaveLength(1);
    });

    test('complete successful workflow should have no failure logs', async () => {
      const sessionId = await createNewSession(client);
      await completeWorkflowToDelegation(client, sessionId);

      // Complete a task successfully
      const taskResult = await client.callTool('start_task', {
        session_id: sessionId,
        task_id: 'successful-workflow-task'
      });
      const taskId = JSON.parse(taskResult.content[0].text).task_id;
      
      await client.callTool('finish_task', {
        session_id: sessionId,
        task_id: taskId,
        status: 'COMPLETED'
      });

      // Complete workflow successfully
      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: { task_ids: [taskId] }
      });

      const implReviewResult = await client.callTool('submit_review', {
        session_id: sessionId,
        review_type: 'IMPLEMENTATION',
        verdict: 'APPROVED'
      });
      const implReviewId = JSON.parse(implReviewResult.content[0].text).review_id;

      await client.callTool('request_next_state', {
        session_id: sessionId,
        evidence: { review_id: implReviewId }
      });

      // Add delay and reload session
      await new Promise(resolve => setTimeout(resolve, 100));
      sessionManager.clearCache();
      const sessionData = await sessionManager.loadSession(sessionId);

      // Verify no failures were logged throughout entire workflow
      expect(sessionData.transition_failures).toHaveLength(0);
      expect(sessionData.validation_failures).toHaveLength(0);
      
      // Verify successful completion
      expect(sessionData.current_state).toBe('DONE');
      expect(sessionData.state_history.length).toBeGreaterThan(0);
    });
  });

  describe('Session File Direct Verification', () => {
    test('should verify logging by reading session files directly from disk', async () => {
      const sessionId = await createNewSession(client);

      // Create multiple types of failures
      await expect(
        client.callTool('request_next_state', { 
          session_id: sessionId, 
          evidence: {} 
        })
      ).rejects.toThrow();

      await expect(
        client.callTool('request_next_state', { 
          session_id: sessionId, 
          evidence: {
            clarifying_questions_text: 'x', // Too short
            clarifying_answers_text: 'Valid answer'
          }
        })
      ).rejects.toThrow();

      // Add delay to ensure all writes complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Read session file directly from disk
      const sessionFilePath = sessionManager._getSessionPath(sessionId);
      const fileContent = await readFile(sessionFilePath, 'utf8');
      const sessionDataFromFile = JSON.parse(fileContent);

      // Verify multiple failures are recorded in file
      expect(sessionDataFromFile.transition_failures).toBeDefined();
      expect(sessionDataFromFile.transition_failures.length).toBeGreaterThanOrEqual(1);
      
      // Verify specific failure types exist
      const failureTypes = sessionDataFromFile.transition_failures.map(f => f.type);
      expect(failureTypes.length).toBeGreaterThan(0);
      // At least one should be a missing_evidence or invalid_format failure
      const hasExpectedType = failureTypes.some(type => 
        type === 'missing_evidence' || type === 'invalid_format'
      );
      expect(hasExpectedType).toBe(true);
      
      // Verify timestamps are valid dates
      for (const failure of sessionDataFromFile.transition_failures) {
        expect(failure.timestamp).toBeDefined();
        expect(new Date(failure.timestamp)).toBeInstanceOf(Date);
        expect(isNaN(Date.parse(failure.timestamp))).toBe(false);
      }
    });

    test('should verify logging format matches expected structure', async () => {
      const sessionId = await createNewSession(client);

      // Log a specific validation failure
      await sessionManager.logValidationFailure(
        sessionId,
        'format_test',
        'Testing logging format verification',
        'EXPECTED_STATE',
        'ATTEMPTED_STATE'
      );

      // Log a specific transition failure
      await sessionManager.logTransitionFailure(
        sessionId,
        'transition_test',
        'Testing transition failure logging',
        'STATE_A -> STATE_B'
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Read and verify structure
      const sessionFilePath = sessionManager._getSessionPath(sessionId);
      const fileContent = await readFile(sessionFilePath, 'utf8');
      const sessionDataFromFile = JSON.parse(fileContent);

      // Verify validation failure structure
      expect(sessionDataFromFile.validation_failures).toHaveLength(1);
      const validationFailure = sessionDataFromFile.validation_failures[0];
      expect(validationFailure).toMatchObject({
        timestamp: expect.any(String),
        type: 'format_test',
        details: 'Testing logging format verification',
        expected_state: 'EXPECTED_STATE',
        attempted_state: 'ATTEMPTED_STATE'
      });

      // Verify transition failure structure
      expect(sessionDataFromFile.transition_failures).toHaveLength(1);
      const transitionFailure = sessionDataFromFile.transition_failures[0];
      expect(transitionFailure).toMatchObject({
        timestamp: expect.any(String),
        type: 'transition_test',
        details: 'Testing transition failure logging',
        attempted_transition: 'STATE_A -> STATE_B'
      });
    });
  });
});