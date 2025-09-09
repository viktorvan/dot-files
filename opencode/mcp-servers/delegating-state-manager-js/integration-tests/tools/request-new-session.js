/**
 * Session creation tests using request_new_session tool
 */

import { MCPTestClient } from '../helpers.js';
import { homedir } from 'os';
import path from 'path';

/**
 * Get the default sessions directory path
 * Uses ~/.local/share/opencode/sessions
 */
function getDefaultSessionsDir() {
  const home = homedir();
  return path.join(home, '.local', 'share', 'opencode', 'sessions');
}

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

  test('Session files are created on disk immediately', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create first session
    const result1 = await client.callTool('request_new_session', {});
    const response1 = JSON.parse(result1.content[0].text);
    const sessionId1 = response1.session_id;
    const sessionPath1 = path.join(getDefaultSessionsDir(), `${sessionId1}.json`);
    
    // Verify file exists immediately
    const fileExists1 = await fs.access(sessionPath1).then(() => true).catch(() => false);
    expect(fileExists1).toBe(true);
    
    // Read and verify file content
    const fileContent1 = await fs.readFile(sessionPath1, 'utf8');
    const sessionData1 = JSON.parse(fileContent1);
    expect(sessionData1.session_id).toBe(sessionId1);
    expect(sessionData1.current_state).toBe('ANALYSIS');
    expect(sessionData1.created_at).toBeTruthy();
    
    // Create second session and verify it's different
    const result2 = await client.callTool('request_new_session', {});
    const response2 = JSON.parse(result2.content[0].text);
    const sessionId2 = response2.session_id;
    const sessionPath2 = path.join(getDefaultSessionsDir(), `${sessionId2}.json`);
    
    // Verify second file exists and is different
    const fileExists2 = await fs.access(sessionPath2).then(() => true).catch(() => false);
    expect(fileExists2).toBe(true);
    expect(sessionPath1).not.toBe(sessionPath2);
    
    // Read and verify second file content is different
    const fileContent2 = await fs.readFile(sessionPath2, 'utf8');
    const sessionData2 = JSON.parse(fileContent2);
    expect(sessionData2.session_id).toBe(sessionId2);
    expect(sessionData2.session_id).not.toBe(sessionData1.session_id);
    expect(sessionData2.state_id).not.toBe(sessionData1.state_id);
    
    // Cleanup test files
    try {
      await fs.unlink(sessionPath1);
      await fs.unlink(sessionPath2);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('Rapid session creation produces distinct files', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const sessionIds = [];
    const sessionPaths = [];
    
    try {
      // Create multiple sessions rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(client.callTool('request_new_session', {}));
      }
      
      const results = await Promise.all(promises);
      
      // Verify all sessions were created with unique IDs
      for (const result of results) {
        const response = JSON.parse(result.content[0].text);
        const sessionId = response.session_id;
        const sessionPath = path.join(getDefaultSessionsDir(), `${sessionId}.json`);
        
        expect(sessionId).toBeTruthy();
        expect(sessionIds).not.toContain(sessionId); // Ensure uniqueness
        sessionIds.push(sessionId);
        sessionPaths.push(sessionPath);
        
        // Verify file exists on disk
        const fileExists = await fs.access(sessionPath).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
        
        // Verify file content is correct
        const fileContent = await fs.readFile(sessionPath, 'utf8');
        const sessionData = JSON.parse(fileContent);
        expect(sessionData.session_id).toBe(sessionId);
        expect(sessionData.current_state).toBe('ANALYSIS');
        expect(sessionData.created_at).toBeTruthy();
        expect(sessionData.state_id).toBeTruthy();
      }
      
      // Verify all session IDs are unique
      const uniqueIds = [...new Set(sessionIds)];
      expect(uniqueIds.length).toBe(sessionIds.length);
      
    } finally {
      // Cleanup test files
      for (const sessionPath of sessionPaths) {
        try {
          await fs.unlink(sessionPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });

  test('Multiple session files have clean initial state', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const sessionPaths = [];
    
    try {
      // Create 3 distinct sessions
      const sessionData = [];
      for (let i = 0; i < 3; i++) {
        const result = await client.callTool('request_new_session', {});
        const response = JSON.parse(result.content[0].text);
        const sessionId = response.session_id;
        const sessionPath = path.join(getDefaultSessionsDir(), `${sessionId}.json`);
        sessionPaths.push(sessionPath);
        
        // Read file content directly from disk
        const fileContent = await fs.readFile(sessionPath, 'utf8');
        const diskData = JSON.parse(fileContent);
        sessionData.push(diskData);
        
        // Verify each session has clean initial state
        expect(diskData.current_state).toBe('ANALYSIS');
        expect(diskData.state_history).toEqual([]);
        expect(diskData.assigned_tasks).toEqual({});
        expect(diskData.plan_review_id).toBeNull();
        expect(diskData.implementation_review_id).toBeNull();
        expect(diskData.validation_failures).toEqual([]);
        expect(diskData.transition_failures).toEqual([]);
      }
      
      // Verify all sessions are distinct
      const sessionIds = sessionData.map(s => s.session_id);
      const uniqueIds = [...new Set(sessionIds)];
      expect(uniqueIds.length).toBe(3);
      
      // Verify all state_ids are distinct
      const stateIds = sessionData.map(s => s.state_id);
      const uniqueStateIds = [...new Set(stateIds)];
      expect(uniqueStateIds.length).toBe(3);
      
      // Verify creation timestamps are different (sessions created sequentially)
      const timestamps = sessionData.map(s => new Date(s.created_at).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i-1]);
      }
      
    } finally {
      // Cleanup test files
      for (const sessionPath of sessionPaths) {
        try {
          await fs.unlink(sessionPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });
});