/**
 * Start Task Tool
 * Creates task record in session with STARTED status
 */
export async function handleStartTask(args, { sessionManager, stateMachine }) {
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
      status: 'started',
      started_at: new Date().toISOString()
    };
    
    // Update session data with new task
    const assignedTasks = sessionData.assigned_tasks || {};
    assignedTasks[sanitizedTaskId] = taskRecord;
    
    await sessionManager.updateSession(session_id, {
      assigned_tasks: assignedTasks
    });
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          task_id: sanitizedTaskId,
          session: sessionManager._getSessionPath(session_id)
        })
      }]
    };
    
  } catch (error) {
    throw new Error(`start_task failed: ${error.message}`);
  }
}