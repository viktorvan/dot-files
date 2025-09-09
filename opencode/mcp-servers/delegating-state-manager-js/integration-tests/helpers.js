#!/usr/bin/env node
/**
 * Shared helpers and utilities for MCP server integration tests
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the default sessions directory path
 * Uses ~/.local/share/opencode/sessions
 */
function getDefaultSessionsDir() {
  const home = homedir();
  return path.join(home, '.local', 'share', 'opencode', 'sessions');
}

export class MCPTestClient {
  constructor() {
    this.serverProcess = null;
    this.requestId = 0;
    this.responseBuffer = '';
    this.responseResolvers = new Map();
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      // Spawn server process with stdio communication
      this.serverProcess = spawn('node', [path.join(__dirname, '..', 'server.js')], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        this.responseBuffer += data.toString();
        this.processResponses();
      });

      // Handle server errors
      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      // Handle server exit
      this.serverProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Server exited with code ${code}`);
        }
      });

      // Initialize MCP connection
      this.sendRequest({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: false
            }
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      }).then(() => {
        resolve();
      }).catch(reject);
    });
  }

  processResponses() {
    const lines = this.responseBuffer.split('\n');
    this.responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          if (response.id !== undefined && this.responseResolvers.has(response.id)) {
            const resolver = this.responseResolvers.get(response.id);
            this.responseResolvers.delete(response.id);
            
            if (response.error) {
              resolver.reject(new Error(response.error.message || 'Unknown error'));
            } else {
              resolver.resolve(response);
            }
          }
        } catch (error) {
          console.error('Failed to parse response:', line, error);
        }
      }
    }
  }

  sendRequest(request) {
    return new Promise((resolve, reject) => {
      const id = request.id;
      this.responseResolvers.set(id, { resolve, reject });
      
      const message = JSON.stringify(request) + '\n';
      this.serverProcess.stdin.write(message);
    });
  }

  async listTools() {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list',
      params: {}
    });
    return response.result;
  }

  async callTool(name, args) {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: name,
        arguments: args
      }
    });
    return response.result;
  }

  async shutdown() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

// TestRunner removed - Jest will handle test execution

/**
 * Helper function to create a new session and get to ANALYSIS state
 */
export async function createNewSession(client) {
  const result = await client.callTool('request_new_session', {});
  const response = JSON.parse(result.content[0].text);
  return response.session_id;
}

/**
 * Helper function to complete workflow up to DELEGATION state
 */
export async function completeWorkflowToDelegation(client, sessionId, planText = 'Comprehensive integration test plan to validate all MCP server functionality') {
  // ANALYSIS → PLAN
  await client.callTool('request_next_state', {
    session_id: sessionId,
    evidence: {
      clarifying_questions_text: 'What is the main objective?',
      clarifying_answers_text: 'Complete integration test workflow.'
    }
  });

  // PLAN → REVIEW_PLAN
  await client.callTool('request_next_state', {
    session_id: sessionId,
    evidence: { plan_summary: planText }
  });

  // Submit plan review
  const planReviewResult = await client.callTool('submit_review', {
    session_id: sessionId,
    review_type: 'PLAN',
    verdict: 'APPROVED'
  });
  const planReview = JSON.parse(planReviewResult.content[0].text);

  // REVIEW_PLAN → USER_APPROVAL
  await client.callTool('request_next_state', {
    session_id: sessionId,
    evidence: { review_id: planReview.review_id }
  });

  // USER_APPROVAL → DELEGATION
  await client.callTool('request_next_state', {
    session_id: sessionId,
    evidence: { user_approval_text: 'yes i approve' }
  });

  return planReview.review_id;
}
/**
 * Helper function to clean up test sessions
 */
export async function cleanupTestSessions(sessionIds) {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  for (const sessionId of sessionIds) {
    try {
      const sessionPath = path.join(getDefaultSessionsDir(), `${sessionId}.json`);
      await fs.unlink(sessionPath);
    } catch (error) {
      // Ignore cleanup errors - session may not exist
    }
  }
}

/**
 * Helper function to parse tool call responses
 */
export function parseToolResponse(result) {
  if (result && result.content && result.content[0] && result.content[0].text) {
    return JSON.parse(result.content[0].text);
  }
  return result;
}
