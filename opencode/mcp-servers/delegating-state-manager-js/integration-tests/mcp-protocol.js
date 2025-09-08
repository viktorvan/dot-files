/**
 * MCP Protocol integration tests - initialization and basic protocol functionality
 */

import { MCPTestClient } from './helpers.js';

describe('MCP Protocol Tests', () => {
  let client;

  beforeEach(() => {
    client = new MCPTestClient();
  });

  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
  });

  test('MCP Protocol Initialization', async () => {
    await client.startServer();
    // If we get here without throwing, the server started successfully
    expect(client.serverProcess).toBeTruthy();
  });

  test('List Available Tools', async () => {
    await client.startServer();
    const tools = await client.listTools();
    const expectedTools = ['request_new_session', 'request_next_state', 'submit_review', 'start_task', 'finish_task'];
    
    expect(tools).toBeTruthy();
    expect(Array.isArray(tools.tools)).toBe(true);
    
    const toolNames = tools.tools.map(t => t.name);
    for (const expected of expectedTools) {
      expect(toolNames).toContain(expected);
    }
    
    expect(tools.tools.length).toBe(5);
  });
});