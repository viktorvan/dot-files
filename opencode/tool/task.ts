import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { StateMachine } from '../lib/state-machine.js';
import type { TaskStatus } from '../lib/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { validateXML } from 'xsd-schema-validator';

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

// Path to XSD schema for validation
const taskSchemaPath = path.join('./prompts', 'task_delegation_format.xml');

export const task_add = tool({
  description: 'Add a task in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add task to'),
    task_id: tool.schema.string().describe('Task identifier'),
    task_xml: tool.schema.string().describe('Task content in XML format according to task_delegation_format.xml')
  },
  async execute(args: { session_id: string; task_id: string; task_xml: string }, _context: ToolContext) {
    try {
      const { session_id, task_id, task_xml } = args;
      
      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }
      
      if (!task_id) {
        throw new Error('Missing required parameter: task_id');
      }
      
      if (!task_xml) {
        throw new Error('Missing required parameter: task_xml');
      }
      
      // Sanitize task_id: convert hyphens to underscores
      const sanitizedTaskId = task_id.replace(/-/g, '_');
      
      // Load session to validate it exists
      await sessionManager.loadSession(session_id);
      
      // Validate XML structure using xml2js
      try {
        await parseStringPromise(task_xml);
      } catch (parseError) {
        throw new Error(`Invalid XML: ${(parseError as Error).message}`);
      }
      
      // Validate XML against XSD schema
      try {
        const validationResult = await validateXML(task_xml, taskSchemaPath);
        if (!validationResult.valid) {
          const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
          throw new Error(`XML does not conform to task schema: ${errorMsg}`);
        }
      } catch (schemaError) {
        throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
      }
      
      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_${sanitizedTaskId}.xml`);
      await fs.writeFile(filePath, task_xml, 'utf8');
      
      return JSON.stringify({
        success: true,
        message: `Task XML saved to ${filePath} successfully`
      });
      
    } catch (error) {
      throw new Error(`task_add failed: ${(error as Error).message}`);
    }
  }
});

export const task_read = tool({
  description: 'Read the task XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read task from'),
    task_id: tool.schema.string().describe('Task identifier')
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
      
      // Sanitize task_id: convert hyphens to underscores
      const sanitizedTaskId = task_id.replace(/-/g, '_');
      
      // Load session to validate it exists
      await sessionManager.loadSession(session_id);
      
      // Read from file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_${sanitizedTaskId}.xml`);
      const taskXml = await fs.readFile(filePath, 'utf8');
      
      // Validate XML structure using xml2js
      try {
        await parseStringPromise(taskXml);
      } catch (parseError) {
        throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
      }
      
      // Validate XML against XSD schema
      try {
        const validationResult = await validateXML(taskXml, taskSchemaPath);
        if (!validationResult.valid) {
          const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
          throw new Error(`XML in file does not conform to task schema: ${errorMsg}`);
        }
      } catch (schemaError) {
        throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
      }
      
      return taskXml;
      
    } catch (error) {
      throw new Error(`task_read failed: ${(error as Error).message}`);
    }
  }
});