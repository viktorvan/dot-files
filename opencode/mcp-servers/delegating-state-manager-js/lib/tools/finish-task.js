/**
 * Finish Task Tool  
 * Updates task status to completed, aborted, or cancelled
 */
export async function handleFinishTask(args, { sessionManager, stateMachine }) {
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
    const statusLower = status.toLowerCase();
    
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
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          task_id: sanitizedTaskId,
          status: status,
          session: sessionManager._getSessionPath(session_id)
        })
      }]
    };
    
  } catch (error) {
    throw new Error(`finish_task failed: ${error.message}`);
  }
}