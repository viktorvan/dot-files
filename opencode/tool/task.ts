import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { StateMachine } from '../lib/state-machine.js';
import type { TaskStatus } from '../lib/types.js';

// Initialize shared instances
const sessionManager = new SessionManager();
const stateMachine = new StateMachine();

export const start_task = tool({
  description: 'Start working on a task. Creates task record in session with STARTED status.',
  args: {
    session_id: tool.schema.string().describe('Session ID to start task in'),
    task_id: tool.schema.string().describe('Unique task identifier assigned by delegating manager (hyphens auto-converted to underscores)')
  },
  async execute(args: { session_id: string; task_id: string }, _context: ToolContext) {
    try {
      const { session_id, task_id } = args;
      
      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }
      
      if (!task_id) {
        throw new Error('Missing required parameter: task_id');
      }
      
      // Sanitize task_id: convert hyphens to underscores for snake_case
      const sanitizedTaskId = task_id.replace(/-/g, '_');
      
      // Load session
      const sessionData = await sessionManager.loadSession(session_id);
      
      // Check if task already exists
      if (sessionData.assigned_tasks && sessionData.assigned_tasks[sanitizedTaskId]) {
        throw new Error(`Task ${sanitizedTaskId} already exists in session`);
      }
      
      // Create task record with STARTED status
      const taskRecord = {
        task_id: sanitizedTaskId,
        status: 'started' as TaskStatus,
        started_at: new Date().toISOString()
      };
      
      // Update session data with new task
      const assignedTasks = sessionData.assigned_tasks || {};
      assignedTasks[sanitizedTaskId] = taskRecord;
      
      await sessionManager.updateSession(session_id, {
        assigned_tasks: assignedTasks
      });
      
      return JSON.stringify({
        success: true,
        task_id: sanitizedTaskId,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      throw new Error(`start_task failed: ${(error as Error).message}`);
    }
  }
});

export const finish_task = tool({
  description: 'Finish a task with final status. Task must be in STARTED state.',
  args: {
    session_id: tool.schema.string().describe('Session ID containing the task'),
    task_id: tool.schema.string().describe('Task identifier to finish'),
    status: tool.schema.string().describe('Final task status').refine((val) => 
      ['COMPLETED', 'ABORTED', 'CANCELLED'].includes(val), 
      { message: 'Status must be COMPLETED, ABORTED, or CANCELLED' }
    )
  },
  async execute(args: { session_id: string; task_id: string; status: string }, _context: ToolContext) {
    try {
      const { session_id, task_id, status } = args;
      
      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }
      
      if (!task_id) {
        throw new Error('Missing required parameter: task_id');
      }
      
      if (!status) {
        throw new Error('Missing required parameter: status');
      }
      
      // Sanitize task_id: convert hyphens to underscores for snake_case
      const sanitizedTaskId = task_id.replace(/-/g, '_');
      
      // Validate status
      if (!['COMPLETED', 'ABORTED', 'CANCELLED'].includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be COMPLETED, ABORTED, or CANCELLED`);
      }
      
      // Load session
      const sessionData = await sessionManager.loadSession(session_id);
      
      // Check if task exists and is started
      if (!sessionData.assigned_tasks || !sessionData.assigned_tasks[sanitizedTaskId]) {
        throw new Error(`Task ${sanitizedTaskId} does not exist in session`);
      }
      
      const currentTask = sessionData.assigned_tasks[sanitizedTaskId];
      if (currentTask.status !== 'started') {
        throw new Error(`Task ${sanitizedTaskId} is not in STARTED state (current: ${currentTask.status})`);
      }
      
      // Convert status to lowercase for storage consistency
      const statusLower = status.toLowerCase() as TaskStatus;
      
      // Update task with finished status
      const updatedTask = {
        ...currentTask,
        status: statusLower,
        finished_at: new Date().toISOString()
      };
      
      const assignedTasks = { ...sessionData.assigned_tasks };
      assignedTasks[sanitizedTaskId] = updatedTask;
      
      await sessionManager.updateSession(session_id, {
        assigned_tasks: assignedTasks
      });
      
      return JSON.stringify({
        success: true,
        task_id: sanitizedTaskId,
        status: status,
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      throw new Error(`finish_task failed: ${(error as Error).message}`);
    }
  }
});