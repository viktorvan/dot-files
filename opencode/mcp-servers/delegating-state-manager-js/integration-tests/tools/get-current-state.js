/**
 * Current state retrieval tests using get_current_state tool
 */

import { MCPTestClient, createNewSession, completeWorkflowToDelegation, cleanupTestSessions, parseToolResponse } from '../helpers.js';

describe('Current State Retrieval Tests', () => {
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

  test('Tool is discoverable via listTools', async () => {
    const tools = await client.listTools();
    const getCurrentStateTool = tools.tools.find(tool => tool.name === 'get_current_state');
    
    expect(getCurrentStateTool).toBeDefined();
    expect(getCurrentStateTool.name).toBe('get_current_state');
    expect(getCurrentStateTool.description).toBe('Returns current state and state_id for a given session_id.');
    expect(getCurrentStateTool.inputSchema).toBeDefined();
    expect(getCurrentStateTool.inputSchema.required).toContain('session_id');
  });

  test('Get current state from new session (ANALYSIS)', async () => {
    const sessionId = await createNewSession(client);
    
    const result = await client.callTool('get_current_state', {
      session_id: sessionId
    });
    
    const response = parseToolResponse(result);
    
    expect(response.current_state).toBe('ANALYSIS');
    expect(response.state_id).toBeTruthy();
    expect(response.session).toBeTruthy();
    expect(response.session).toMatch(/\.json$/);
    expect(response.session).toContain(sessionId);
    
    // Verify state_id is UUID format
    expect(response.state_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('Get current state after state transition', async () => {
    const sessionId = await createNewSession(client);
    
    // Initial state should be ANALYSIS
    let result = await client.callTool('get_current_state', {
      session_id: sessionId
    });
    let response = parseToolResponse(result);
    expect(response.current_state).toBe('ANALYSIS');
    const initialStateId = response.state_id;
    
    // Transition to PLAN state
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What is the main objective?',
        clarifying_answers_text: 'Test state transition and retrieval.'
      }
    });
    
    // Check state after transition
    result = await client.callTool('get_current_state', {
      session_id: sessionId
    });
    response = parseToolResponse(result);
    
    expect(response.current_state).toBe('PLAN');
    expect(response.state_id).toBeTruthy();
    expect(response.state_id).not.toBe(initialStateId); // State ID should change
    expect(response.session).toContain(sessionId);
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('Get current state from multiple sessions', async () => {
    const sessionId1 = await createNewSession(client);
    const sessionId2 = await createNewSession(client);
    
    // Get state from first session
    const result1 = await client.callTool('get_current_state', {
      session_id: sessionId1
    });
    const response1 = parseToolResponse(result1);
    
    // Get state from second session
    const result2 = await client.callTool('get_current_state', {
      session_id: sessionId2
    });
    const response2 = parseToolResponse(result2);
    
    // Both should be in ANALYSIS state
    expect(response1.current_state).toBe('ANALYSIS');
    expect(response2.current_state).toBe('ANALYSIS');
    
    // But should have different state IDs and sessions
    expect(response1.state_id).not.toBe(response2.state_id);
    expect(response1.session).not.toBe(response2.session);
    expect(response1.session).toContain(sessionId1);
    expect(response2.session).toContain(sessionId2);
    
    // Cleanup
    await cleanupTestSessions([sessionId1, sessionId2]);
  });

  test('Get current state tracks state changes through workflow', async () => {
    const sessionId = await createNewSession(client);
    const states = [];
    const stateIds = [];
    
    // Track initial state
    let result = await client.callTool('get_current_state', { session_id: sessionId });
    let response = parseToolResponse(result);
    states.push(response.current_state);
    stateIds.push(response.state_id);
    
    // Progress through workflow states
    await completeWorkflowToDelegation(client, sessionId);
    
    // Check final state
    result = await client.callTool('get_current_state', { session_id: sessionId });
    response = parseToolResponse(result);
    states.push(response.current_state);
    stateIds.push(response.state_id);
    
    expect(states[0]).toBe('ANALYSIS');
    expect(states[1]).toBe('DELEGATION');
    expect(stateIds[0]).not.toBe(stateIds[1]); // State IDs should be different
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('Error handling - missing session_id parameter', async () => {
    await expect(client.callTool('get_current_state', {}))
      .rejects
      .toThrow(/Missing required parameter: session_id/);
  });

  test('Error handling - invalid session_id', async () => {
    const invalidSessionId = 'invalid-session-id-that-does-not-exist';
    
    await expect(client.callTool('get_current_state', {
      session_id: invalidSessionId
    }))
      .rejects
      .toThrow();
  });

  test('Error handling - null session_id', async () => {
    await expect(client.callTool('get_current_state', {
      session_id: null
    }))
      .rejects
      .toThrow(/Missing required parameter: session_id/);
  });

  test('Error handling - undefined session_id', async () => {
    await expect(client.callTool('get_current_state', {
      session_id: undefined
    }))
      .rejects
      .toThrow(/Missing required parameter: session_id/);
  });

  test('Error handling - empty string session_id', async () => {
    await expect(client.callTool('get_current_state', {
      session_id: ''
    }))
      .rejects
      .toThrow();
  });

  test('Consistent state_id within same state', async () => {
    const sessionId = await createNewSession(client);
    
    // Get current state multiple times
    const result1 = await client.callTool('get_current_state', { session_id: sessionId });
    const response1 = parseToolResponse(result1);
    
    const result2 = await client.callTool('get_current_state', { session_id: sessionId });
    const response2 = parseToolResponse(result2);
    
    const result3 = await client.callTool('get_current_state', { session_id: sessionId });
    const response3 = parseToolResponse(result3);
    
    // State and state_id should be consistent
    expect(response1.current_state).toBe(response2.current_state);
    expect(response2.current_state).toBe(response3.current_state);
    expect(response1.state_id).toBe(response2.state_id);
    expect(response2.state_id).toBe(response3.state_id);
    
    // Session path should be consistent
    expect(response1.session).toBe(response2.session);
    expect(response2.session).toBe(response3.session);
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('State changes are immediately reflected', async () => {
    const sessionId = await createNewSession(client);
    
    // Get initial state
    let result = await client.callTool('get_current_state', { session_id: sessionId });
    let response = parseToolResponse(result);
    expect(response.current_state).toBe('ANALYSIS');
    const initialStateId = response.state_id;
    
    // Perform state transition
    await client.callTool('request_next_state', {
      session_id: sessionId,
      evidence: {
        clarifying_questions_text: 'What is the objective?',
        clarifying_answers_text: 'Test immediate state reflection.'
      }
    });
    
    // Immediately check state after transition
    result = await client.callTool('get_current_state', { session_id: sessionId });
    response = parseToolResponse(result);
    
    expect(response.current_state).toBe('PLAN');
    expect(response.state_id).not.toBe(initialStateId);
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('Response structure matches expected format', async () => {
    const sessionId = await createNewSession(client);
    
    const result = await client.callTool('get_current_state', {
      session_id: sessionId
    });
    
    // Verify MCP response structure
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    
    // Verify JSON response structure
    const response = parseToolResponse(result);
    expect(response).toHaveProperty('current_state');
    expect(response).toHaveProperty('state_id');
    expect(response).toHaveProperty('session');
    
    // Verify data types
    expect(typeof response.current_state).toBe('string');
    expect(typeof response.state_id).toBe('string');
    expect(typeof response.session).toBe('string');
    
    // Cleanup
    await cleanupTestSessions([sessionId]);
  });

  test('Works with sessions across different workflow stages', async () => {
    const sessionAnalysis = await createNewSession(client);
    
    // Create another session and advance it
    const sessionDelegation = await createNewSession(client);
    await completeWorkflowToDelegation(client, sessionDelegation);
    
    // Check both sessions
    const resultAnalysis = await client.callTool('get_current_state', {
      session_id: sessionAnalysis
    });
    const responseAnalysis = parseToolResponse(resultAnalysis);
    
    const resultDelegation = await client.callTool('get_current_state', {
      session_id: sessionDelegation
    });
    const responseDelegation = parseToolResponse(resultDelegation);
    
    expect(responseAnalysis.current_state).toBe('ANALYSIS');
    expect(responseDelegation.current_state).toBe('DELEGATION');
    expect(responseAnalysis.state_id).not.toBe(responseDelegation.state_id);
    
    // Cleanup
    await cleanupTestSessions([sessionAnalysis, sessionDelegation]);
  });
});