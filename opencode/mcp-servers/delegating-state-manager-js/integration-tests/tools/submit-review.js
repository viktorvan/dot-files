/**
 * Review submission tests using submit_review tool
 */

import { MCPTestClient, createNewSession, completeWorkflowToDelegation } from '../helpers.js';

describe('Submit Review Tests', () => {
  let client;

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.startServer();
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
  });

  test('Submit PLAN Review (APPROVED)', async () => {
    const sessionId = await createNewSession(client);
    
    // Go to REVIEW_PLAN state
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What needs to be planned?',
        clarifying_answers_text: 'We need to test the review submission functionality.'
      }
    });
    
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { plan_summary: 'Comprehensive plan for testing review submission functionality in the MCP server' }
    });

    const result = await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.verdict).toBe('APPROVED');
    expect(response.review_id).toBeTruthy();
  });

  test('Submit IMPLEMENTATION Review (APPROVED)', async () => {
    // Complete workflow to get an implementation review
    const newSessionId = await createNewSession(client);
    await completeWorkflowToDelegation(client, newSessionId);
    
    // Create and complete a task
    const taskResult = await client.callTool('start_task', {
      session_id: newSessionId,
      task_id: 'implementation-review-test-task'
    });
    const taskId = JSON.parse(taskResult.content[0].text).task_id;
    
    await client.callTool('finish_task', {
      session_id: newSessionId,
      task_id: taskId,
      status: 'COMPLETED'
    });

    // Transition to REVIEW_IMPLEMENTATION
    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: { task_ids: [taskId] }
    });

    const result = await client.callTool('submit_review', {
      session_id: newSessionId,
      review_type: 'IMPLEMENTATION',
      verdict: 'APPROVED'
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.verdict).toBe('APPROVED');
    expect(response.review_id).toBeTruthy();
  });

  test('Error: Wrong Review ID in REVIEW_PLAN → USER_APPROVAL', async () => {
    const newSessionId = await createNewSession(client);

    // ANALYSIS → PLAN
    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: {
        clarifying_questions_text: 'What is the main objective?',
        clarifying_answers_text: 'Test proper review ID validation.'
      }
    });

    // PLAN → REVIEW_PLAN
    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: { plan_summary: 'Comprehensive test plan for review ID validation procedures' }
    });

    // Submit review
    await client.callTool('submit_review', {
      session_id: newSessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    });

    // Try to transition with WRONG review_id - should fail now
    await expect(client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: {
        review_id: '00000000-0000-0000-0000-000000000000'  // Wrong review ID
      },
      notes: 'Testing wrong review ID validation'
    })).rejects.toThrow(/does not match/);
  });

  test('Error: REJECTED Review in REVIEW_PLAN → USER_APPROVAL', async () => {
    const newSessionId = await createNewSession(client);

    // ANALYSIS → PLAN
    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: {
        clarifying_questions_text: 'What is the main objective?',
        clarifying_answers_text: 'Test rejected review validation.'
      }
    });

    // PLAN → REVIEW_PLAN
    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: { plan_summary: 'Comprehensive test plan for rejected review validation procedures' }
    });

    // Submit REJECTED review
    const reviewResult = await client.callTool('submit_review', {
      session_id: newSessionId,
      review_type: 'PLAN',
      verdict: 'REJECTED'
    });
    const reviewResponse = JSON.parse(reviewResult.content[0].text);

    // Try to transition with REJECTED review - should fail now
    await expect(client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: {
        review_id: reviewResponse.review_id  // REJECTED review
      },
      notes: 'Testing rejected review validation'
    })).rejects.toThrow(/must be APPROVED/);
  });

  test('Error: Wrong Review ID in REVIEW_IMPLEMENTATION → DONE', async () => {
    // Create complete workflow to reach REVIEW_IMPLEMENTATION
    const newSessionId = await createNewSession(client);
    await completeWorkflowToDelegation(client, newSessionId);

    // Start and finish a valid task for this test
    const validTaskResult = await client.callTool('start_task', {
      session_id: newSessionId,
      task_id: 'test-task-for-implementation-review'
    });
    const validTaskId = JSON.parse(validTaskResult.content[0].text).task_id;
    
    await client.callTool('finish_task', {
      session_id: newSessionId,
      task_id: validTaskId,
      status: 'COMPLETED'
    });

    await client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: { task_ids: [validTaskId] }
    });

    // Submit implementation review
    await client.callTool('submit_review', {
      session_id: newSessionId,
      review_type: 'IMPLEMENTATION',
      verdict: 'APPROVED'
    });

    // Try to transition with WRONG implementation review_id - should fail
    await expect(client.callTool('request_next_state', {
      session_id: newSessionId,
      evidence: {
        review_id: 'wrong-implementation-review-00000000-0000-0000-0000-000000000000'
      },
      notes: 'Testing wrong implementation review ID'
    })).rejects.toThrow(/does not match/);
  });
});