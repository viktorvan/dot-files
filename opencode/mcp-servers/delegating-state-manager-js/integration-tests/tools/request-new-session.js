/**
 * Session creation tests using request_new_session tool
 */

import { MCPTestClient } from '../helpers.js';

describe('Session Creation Tests', () => {
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

  test('Create New Session (ANALYSIS)', async () => {
    const result = await client.callTool('request_new_session', {});
    const response = JSON.parse(result.content[0].text);
    
    expect(response.approved).toBe(true);
    expect(response.state).toBe('ANALYSIS');
    expect(response.state_id).toBeTruthy();
    expect(response.session_id).toBeTruthy();
    expect(response.session).toBeTruthy();
    expect(response.session).toMatch(/\.json$/);
    
    // Verify session_id format (date-based)
    const sessionId = response.session_id;
    expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-[a-z0-9]{6}$/);
  });

  test('Multiple session creation returns different sessions', async () => {
    const result1 = await client.callTool('request_new_session', {});
    const response1 = JSON.parse(result1.content[0].text);
    
    const result2 = await client.callTool('request_new_session', {});
    const response2 = JSON.parse(result2.content[0].text);
    
    expect(response1.session_id).not.toBe(response2.session_id);
    expect(response1.state_id).not.toBe(response2.state_id);
    expect(response1.session).not.toBe(response2.session);
    
    // Both should be in ANALYSIS state
    expect(response1.state).toBe('ANALYSIS');
    expect(response2.state).toBe('ANALYSIS');
  });

  test('Session creation with no parameters', async () => {
    // Test that empty object works
    const result1 = await client.callTool('request_new_session', {});
    const response1 = JSON.parse(result1.content[0].text);
    expect(response1.approved).toBe(true);
    expect(response1.state).toBe('ANALYSIS');

    // Test that no arguments also works
    const result2 = await client.callTool('request_new_session');
    const response2 = JSON.parse(result2.content[0].text);
    expect(response2.approved).toBe(true);
    expect(response2.state).toBe('ANALYSIS');
  });

  test('Created session has proper structure', async () => {
    const result = await client.callTool('request_new_session', {});
    const response = JSON.parse(result.content[0].text);
    
    // Verify all required response fields
    expect(response).toHaveProperty('approved', true);
    expect(response).toHaveProperty('state', 'ANALYSIS');
    expect(response).toHaveProperty('state_id');
    expect(response).toHaveProperty('session_id');
    expect(response).toHaveProperty('session');
    
    // Verify data types
    expect(typeof response.state_id).toBe('string');
    expect(typeof response.session_id).toBe('string');
    expect(typeof response.session).toBe('string');
    
    // Verify state_id is UUID format
    expect(response.state_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test('New session can be used for state transitions', async () => {
    // Create new session
    const sessionResult = await client.callTool('request_new_session', {});
    const sessionResponse = JSON.parse(sessionResult.content[0].text);
    const sessionId = sessionResponse.session_id;
    
    // Use the session for a state transition
    const transitionResult = await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What is the main objective of this task?',
        clarifying_answers_text: 'The main objective is to test session creation workflow.'
      },
      notes: 'Testing new session workflow'
    });
    
    const transitionResponse = JSON.parse(transitionResult.content[0].text);
    expect(transitionResponse.approved).toBe(true);
    expect(transitionResponse.state).toBe('PLAN');
    expect(transitionResponse.session).toContain(sessionId);
  });
});