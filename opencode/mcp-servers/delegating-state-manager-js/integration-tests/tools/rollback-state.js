/**
 * Integration tests for rollback_state tool
 */

import { MCPTestClient, cleanupTestSessions, parseToolResponse } from '../helpers.js';

describe('rollback_state Tool Tests', () => {
  let client;
  let testSessionIds = [];

  beforeEach(() => {
    client = new MCPTestClient();
    testSessionIds = [];
  });

  afterEach(async () => {
    // Clean up test sessions
    await cleanupTestSessions(testSessionIds);
    
    if (client) {
      await client.shutdown();
    }
  });

  test('Plan Approval Rollback Scenario', async () => {
    await client.startServer();

    // Create session and advance to USER_APPROVAL with plan review
    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // ANALYSIS -> PLAN
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What framework would you like to use?',
        clarifying_answers_text: 'I would like to use React for the frontend.'
      }
    });

    // PLAN -> REVIEW_PLAN
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Create a React application with frontend components and routing'
      }
    });

    // Submit plan review
    const planReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    }));

    // REVIEW_PLAN -> USER_APPROVAL
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        review_id: planReviewResult.review_id
      }
    });

    // Test rollback to PLAN (simulates user not approving)
    const rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    }));

    // Verify rollback results
    expect(rollbackResult.approved).toBe(true);
    expect(rollbackResult.state).toBe('PLAN');
  });

  test('Implementation Review Rollback Scenario', async () => {
    await client.startServer();

    // Create session and advance to REVIEW_IMPLEMENTATION
    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Fast-forward through states to REVIEW_IMPLEMENTATION
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What backend should we use?',
        clarifying_answers_text: 'Please use Node.js with Express for the backend.'
      }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Build a Node.js backend with Express routes and database integration'
      }
    });

    const planReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    }));

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        review_id: planReviewResult.review_id
      }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        user_approval_text: 'Yes I approve'
      }
    });

    // Add completed tasks and advance to REVIEW_IMPLEMENTATION
    await client.callTool('start_task', {
      session_id: sessionId,
      task_id: 'task_backend'
    });

    await client.callTool('finish_task', {
      session_id: sessionId,
      task_id: 'task_backend',
      status: 'COMPLETED'
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        task_ids: ['task_backend']
      }
    });

    // Submit implementation review (NEEDS_REVISION)
    const implReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'IMPLEMENTATION',
      verdict: 'NEEDS_REVISION'
    }));

    // Test rollback to DELEGATION
    const rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'DELEGATION'
    }));

    // Verify rollback results
    expect(rollbackResult.approved).toBe(true);
    expect(rollbackResult.state).toBe('DELEGATION');
  });

  test('Rollback Validation Tests', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Test: Cannot rollback forward
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    })).rejects.toThrow(/Target state must be earlier/);

    // Test: Invalid target state
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'INVALID_STATE'
    })).rejects.toThrow(/Invalid target_state/);

    // Test: Missing required parameters
    await expect(client.callTool('rollback_state', {
      session_id: sessionId
    })).rejects.toThrow(/target_state is required/);
  });

  test('Deep Rollback (REVIEW_IMPLEMENTATION -> PLAN)', async () => {
    await client.startServer();

    // Create session and fast-forward to REVIEW_IMPLEMENTATION
    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Fast-forward through all states
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What architecture should we use?',
        clarifying_answers_text: 'Use microservices architecture.'
      }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Implement microservices architecture with API gateway'
      }
    });

    const planReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    }));

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { review_id: planReviewResult.review_id }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { user_approval_text: 'yes i approve' }
    });

    await client.callTool('start_task', {
      session_id: sessionId,
      task_id: 'task_gateway'
    });

    await client.callTool('finish_task', {
      session_id: sessionId,
      task_id: 'task_gateway',
      status: 'COMPLETED'
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { task_ids: ['task_gateway'] }
    });

    const implReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'IMPLEMENTATION',
      verdict: 'APPROVED'
    }));

    // Test deep rollback to PLAN (should clear both reviews)
    const rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    }));

    // Verify rollback results
    expect(rollbackResult.state).toBe('PLAN');
  });

  test('Invalid Session ID Rollback', async () => {
    await client.startServer();

    // Test rollback with invalid session ID
    await expect(client.callTool('rollback_state', {
      session_id: 'invalid-session-id-123',
      target_state: 'PLAN'
    })).rejects.toThrow(/Session invalid-session-id-123 not found/);
  });

  test('Rollback to Same State (No-op)', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Advance to PLAN state
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What should we build?',
        clarifying_answers_text: 'A web application.'
      }
    });

    // Try to rollback to current state (PLAN)
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    })).rejects.toThrow(/Target state must be earlier/);
  });

  test('Multiple Consecutive Rollbacks', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Fast-forward through multiple states
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What technology stack?',
        clarifying_answers_text: 'MEAN stack with Angular.'
      }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Build MEAN stack application with Angular frontend'
      }
    });

    const planReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    }));

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { review_id: planReviewResult.review_id }
    });

    // First rollback: USER_APPROVAL -> PLAN
    let rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    }));
    expect(rollbackResult.state).toBe('PLAN');

    // Second rollback: PLAN -> ANALYSIS
    rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'ANALYSIS'
    }));
    expect(rollbackResult.state).toBe('ANALYSIS');

    // Verify we cannot rollback further (ANALYSIS is initial state)
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'ANALYSIS'
    })).rejects.toThrow(/Target state must be earlier/);
  });

  test('Review Data Cleared on Rollback', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Fast-forward to create multiple reviews
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What should we create?',
        clarifying_answers_text: 'A mobile application.'
      }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Create a React Native mobile application'
      }
    });

    const planReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'PLAN',
      verdict: 'APPROVED'
    }));

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { review_id: planReviewResult.review_id }
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { user_approval_text: 'YES I APPROVE' }
    });

    await client.callTool('start_task', {
      session_id: sessionId,
      task_id: 'task_mobile'
    });

    await client.callTool('finish_task', {
      session_id: sessionId,
      task_id: 'task_mobile',
      status: 'COMPLETED'
    });

    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { task_ids: ['task_mobile'] }
    });

    // Create implementation review
    const implReviewResult = parseToolResponse(await client.callTool('submit_review', {
      session_id: sessionId,
      review_type: 'IMPLEMENTATION',
      verdict: 'NEEDS_REVISION'
    }));

    // Rollback to PLAN (should clear implementation review but keep plan review initially accessible)
    const rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'PLAN'
    }));

    expect(rollbackResult.state).toBe('PLAN');

    // Verify we cannot use the old implementation review ID
    await expect(client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: { review_id: implReviewResult.review_id }
    })).rejects.toThrow();

    // But plan review should still work for moving forward
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        plan_summary: 'Updated React Native mobile application plan'
      }
    });
  });

  test('Rollback with Invalid State Name', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Test with completely invalid state
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'NONEXISTENT_STATE'
    })).rejects.toThrow(/Invalid target_state/);

    // Test with empty string (this should fail with required parameter message)
    await expect(client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: ''
    })).rejects.toThrow(/target_state is required/);
  });

  test('Rollback Prevents Roll Forward', async () => {
    await client.startServer();

    const createResult = parseToolResponse(await client.callTool('request_new_session', {}));
    const sessionId = createResult.session_id;
    testSessionIds.push(sessionId);

    // Start at ANALYSIS, cannot rollback to any later state
    const laterStates = ['PLAN', 'REVIEW_PLAN', 'USER_APPROVAL', 'DELEGATION', 'REVIEW_IMPLEMENTATION'];
    
    for (const state of laterStates) {
      await expect(client.callTool('rollback_state', {
        session_id: sessionId,
        target_state: state
      })).rejects.toThrow(/Target state must be earlier/);
    }

    // Advance to PLAN
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What do you need?',
        clarifying_answers_text: 'A dashboard application.'
      }
    });

    // From PLAN, cannot rollback to later states
    const laterFromPlan = ['REVIEW_PLAN', 'USER_APPROVAL', 'DELEGATION', 'REVIEW_IMPLEMENTATION'];
    
    for (const state of laterFromPlan) {
      await expect(client.callTool('rollback_state', {
        session_id: sessionId,
        target_state: state
      })).rejects.toThrow(/Target state must be earlier/);
    }

    // But can rollback to ANALYSIS
    const rollbackResult = parseToolResponse(await client.callTool('rollback_state', {
      session_id: sessionId,
      target_state: 'ANALYSIS'
    }));
    expect(rollbackResult.state).toBe('ANALYSIS');
  });
});
