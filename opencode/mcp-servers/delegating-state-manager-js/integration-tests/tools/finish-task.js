/**
 * Task finish tests using finish_task tool
 */

import { MCPTestClient, createNewSession, completeWorkflowToDelegation } from '../helpers.js';

describe('Finish Task Tests', () => {
  let client;
  let sessionId = null;
  let taskIds = [];

  beforeEach(async () => {
    client = new MCPTestClient();
    await client.startServer();

    // Set up session in DELEGATION state and create tasks for finishing
    sessionId = await createNewSession(client);
    await completeWorkflowToDelegation(client, sessionId);

    // Start tasks that we'll finish in tests
    const task1Result = await client.callTool('start_task', {
      session_id: sessionId,
      task_id: 'finish-test-task-1'
    });
    taskIds.push(JSON.parse(task1Result.content[0].text).task_id);

    const task2Result = await client.callTool('start_task', {
      session_id: sessionId,
      task_id: 'finish-test-task-2'
    });
    taskIds.push(JSON.parse(task2Result.content[0].text).task_id);
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
  });

  test('Finish Task (COMPLETED)', async () => {
    const result = await client.callTool('finish_task', {
      session_id: sessionId,
      task_id: taskIds[0],
      status: 'COMPLETED'
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe('COMPLETED');
  });

  test('Finish Task (CANCELLED)', async () => {
    const result = await client.callTool('finish_task', {
      session_id: sessionId,
      task_id: taskIds[1],
      status: 'CANCELLED'
    });
    const response = JSON.parse(result.content[0].text);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe('CANCELLED');
  });

  test('Error: Missing Required Parameters', async () => {
    await expect(client.callTool('finish_task', { session_id: sessionId }))
      .rejects.toThrow(/Missing required parameter/);
  });

  test('Error: Invalid Session ID', async () => {
    await expect(client.callTool('finish_task', {
      session_id: 'invalid-session-id',
      task_id: 'some-task',
      status: 'COMPLETED'
    })).rejects.toThrow(/not found/);
  });

  test('Error: Invalid Task ID', async () => {
    await expect(client.callTool('finish_task', {
      session_id: sessionId,
      task_id: 'nonexistent-task-id',
      status: 'COMPLETED'
    })).rejects.toThrow(/not found|does not exist/);
  });
});