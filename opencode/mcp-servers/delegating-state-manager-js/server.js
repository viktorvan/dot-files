#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

import { SessionManager } from './lib/session.js';
import { StateMachine } from './lib/state-machine.js';

import { handleRequestNewSession } from './lib/tools/request-new-session.js';
import { handleRequestNextState } from './lib/tools/request-next-state.js';
import { handleRollbackState } from './lib/tools/rollback-state.js';
import { handleSubmitReview } from './lib/tools/submit-review.js';
import { handleStartTask } from './lib/tools/start-task.js';
import { handleFinishTask } from './lib/tools/finish-task.js';
import { handleGetCurrentState } from './lib/tools/get-current-state.js';

/**
 * Delegating State Manager MCP Server
 * Manages AI delegation workflow states and transitions using official SDK
 */

// Initialize core dependencies
const sessionManager = new SessionManager();
const stateMachine = new StateMachine();

// Create MCP server instance
const server = new Server(
  {
    name: 'delegating-state-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions matching the bash version API
const TOOLS = {
  request_new_session: {
    name: 'request_new_session',
    description: 'Create a new session in the ANALYSIS state.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: handleRequestNewSession
  },

  request_next_state: {
    name: 'request_next_state',
    description: 'Transition to the next state in the delegation workflow (requires existing session).',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Existing session ID (required)'
        },
        evidence: {
          type: 'object',
          description: 'Evidence object with required fields for current state transition',
          properties: {
            clarifying_questions_text: {
              type: 'string',
              description: 'Text of the clarifying questions asked (ANALYSIS)'
            },
            clarifying_answers_text: {
              type: 'string', 
              description: 'Text describing the answers to clarifying questions (ANALYSIS)'
            },
            plan_summary: {
              type: 'string',
              description: 'Summary of the detailed plan created (PLAN)'
            },
            review_id: {
              type: 'string',
              description: 'Unique identifier for the review - must match approved review in session (REVIEW_PLAN and REVIEW_IMPLEMENTATION)'
            },
            user_approval_text: {
              type: 'string',
              description: 'Quoted text of user approval (USER_APPROVAL)'
            },
            task_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of task IDs that have been completed or cancelled (DELEGATION)'
            }
          }
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the transition'
        }
      },
      required: ['session_id']
    },
    handler: handleRequestNextState
  },

  rollback_state: {
    name: 'rollback_state',
    description: 'Rollback to an earlier state in the delegation workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Existing session ID (required)'
        },
        target_state: {
          type: 'string',
          description: 'Target state to rollback to (must be earlier in workflow)',
          enum: ['ANALYSIS', 'PLAN', 'REVIEW_PLAN', 'USER_APPROVAL', 'DELEGATION', 'REVIEW_IMPLEMENTATION']
        }
      },
      required: ['session_id', 'target_state']
    },
    handler: handleRollbackState
  },

  submit_review: {
    name: 'submit_review',
    description: 'Submit a review verdict for PLAN or IMPLEMENTATION phases. Pure proof-of-work - creates review_id for evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to submit review for'
        },
        review_type: {
          type: 'string',
          description: 'Type of review being submitted',
          enum: ['PLAN', 'IMPLEMENTATION']
        },
        verdict: {
          type: 'string',
          description: 'Review verdict',
          enum: ['APPROVED', 'REJECTED', 'NEEDS_REVISION']
        }
      },
      required: ['session_id', 'review_type', 'verdict']
    },
    handler: handleSubmitReview
  },

  start_task: {
    name: 'start_task', 
    description: 'Start working on a task. Creates task record in session with STARTED status.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to start task in'
        },
        task_id: {
          type: 'string',
          description: 'Unique task identifier assigned by delegating manager (hyphens auto-converted to underscores)'
        }
      },
      required: ['session_id', 'task_id']
    },
    handler: handleStartTask
  },

  finish_task: {
    name: 'finish_task',
    description: 'Finish a task with final status. Task must be in STARTED state.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID containing the task'
        },
        task_id: {
          type: 'string',
          description: 'Task identifier to finish'
        },
        status: {
          type: 'string',
          description: 'Final task status',
          enum: ['COMPLETED', 'ABORTED', 'CANCELLED']
        }
      },
      required: ['session_id', 'task_id', 'status']
    },
    handler: handleFinishTask
  },

  get_current_state: {
    name: 'get_current_state',
    description: 'Returns current state and state_id for a given session_id.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Existing session ID (required)'
        }
      },
      required: ['session_id']
    },
    handler: handleGetCurrentState
  }
};

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(TOOLS).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = TOOLS[name];
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    // Call tool handler with dependencies
    const result = await tool.handler(args, {
      sessionManager,
      stateMachine
    });
    
    return result;
    
  } catch (error) {
    throw new Error(`Tool ${name} execution failed: ${error.message}`);
  }
});

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Keep the process running
  process.stdin.resume();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  process.exit(0);
});

process.on('SIGTERM', async () => {
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
