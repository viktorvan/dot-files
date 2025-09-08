/**
 * Task start tests using start_task tool
 */

import { MCPTestClient, createNewSession, completeWorkflowToDelegation } from '../helpers.js';

describe('Start Task Tests', () => {
  let client;
  let sessionId = null;
  let taskIds = [];

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.startServer();

    // Set up session in DELEGATION state for task operations
    sessionId = await createNewSession(client);
    await completeWorkflowToDelegation(client, sessionId);
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
  });

  test('Start Task (task-1)', async () => {
    const taskId = 'integration-test-task-1';
    const result = await client.callTool('start_task', {
      session_id: sessionId,
      task_id: taskId
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.task_id).toBeTruthy();
    
    taskIds.push(response.task_id);
  });

  test('Start Task (task-2)', async () => {
    const taskId = 'integration-test-task-2';
    const result = await client.callTool('start_task', {
      session_id: sessionId,
      task_id: taskId
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.task_id).toBeTruthy();
    
    taskIds.push(response.task_id);
  });

  test('Error: Missing Required Parameters', async () => {
    await expect(client.callTool('start_task', { session_id: sessionId }))
      .rejects.toThrow(/Missing required parameter/);
  });

  test('Error: Invalid Session ID', async () => {
    await expect(client.callTool('start_task', {
      session_id: 'invalid-session-id',
      task_id: 'test-task'
    })).rejects.toThrow(/not found/);
  });
});