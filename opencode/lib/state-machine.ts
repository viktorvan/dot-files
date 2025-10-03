import Ajv from 'ajv';
import type { 
  StateType, 
  StateDefinition, 
  Evidence, 
  EvidenceSchema, 
  Session, 
  CompiledValidator,
  AjvError
} from './types';

// State definitions with transitions and required evidence
const STATES: Record<StateType, StateDefinition> = {
  ANALYSIS: {
    next: 'PLAN',
    evidence: ['clarifying_questions_text', 'clarifying_answers_text']
  },
  PLAN: {
    next: 'REVIEW_PLAN',
    evidence: ['plan_summary']
  },
  REVIEW_PLAN: {
    next: 'USER_APPROVAL',
    evidence: ['review_id']
  },
  USER_APPROVAL: {
    next: 'DELEGATION',
    evidence: ['user_approval_text']
  },
  DELEGATION: {
    next: 'REVIEW_IMPLEMENTATION',
    evidence: ['task_ids']
  },
  REVIEW_IMPLEMENTATION: {
    next: 'DONE',
    evidence: ['review_id']
  },
  DONE: {
    next: null,
    evidence: []
  }
};

// AJV schemas for evidence validation
const EVIDENCE_SCHEMAS: Record<string, EvidenceSchema> = {
  clarifying_questions_text: {
    type: 'string',
    minLength: 10,
    description: 'Clarifying questions must be at least 10 characters long'
  },
  clarifying_answers_text: {
    type: 'string',
    minLength: 10,
    description: 'Clarifying answers must be at least 10 characters long'
  },
  plan_summary: {
    type: 'string',
    minLength: 20,
    description: 'Plan summary must be at least 20 characters long'
  },
  review_id: {
    type: 'string',
    pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
    description: 'Review ID must be a valid UUID'
  },
  user_approval_text: {
    type: 'string',
    minLength: 1,
    description: 'User approval text is required'
  },
  task_ids: {
    type: 'array',
    items: {
      type: 'string',
      minLength: 1
    },
    minItems: 1,
    description: 'At least one task ID is required'
  }
};

// Simple state machine with AJV validation for descriptive error messages
export class StateMachine {
  private readonly ajv: Ajv;
  private readonly compiledSchemas: Record<string, CompiledValidator>;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false
    });

    // Pre-compile schemas for better performance
    this.compiledSchemas = {};
    for (const [field, schema] of Object.entries(EVIDENCE_SCHEMAS)) {
      this.compiledSchemas[field] = this.ajv.compile(schema) as CompiledValidator;
    }
  }

  getNextState(currentState: StateType): StateType | null {
    if (!STATES[currentState]) {
      throw new Error(`Invalid state: ${currentState}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    return STATES[currentState].next;
  }

  getRequiredEvidence(state: StateType): string[] {
    if (!STATES[state]) {
      throw new Error(`Invalid state: ${state}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    return [...STATES[state].evidence]; // Return copy to prevent mutation
  }

  validateTransition(currentState: StateType, nextState: StateType): boolean {
    if (!STATES[currentState]) {
      throw new Error(`Invalid current state: ${currentState}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    if (!STATES[nextState]) {
      throw new Error(`Invalid next state: ${nextState}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    const expectedNext = STATES[currentState].next;

    if (expectedNext === null) {
      throw new Error(`Cannot transition from terminal state: ${currentState}`);
    }

    if (nextState !== expectedNext) {
      throw new Error(
        `Invalid state transition: cannot go from ${currentState} to ${nextState}. ` +
          `Expected next state: ${expectedNext}`
      );
    }

    return true;
  }

  // Validates evidence completeness and format for a state, with special business logic for reviews and task validation
  validateEvidence(state: StateType, evidence: Evidence, session?: Session): boolean {
    if (!STATES[state]) {
      throw new Error(`Invalid state: ${state}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    const requiredFields = STATES[state].evidence;

    // Check if evidence is provided when required
    if (requiredFields.length > 0 && (!evidence || typeof evidence !== 'object')) {
      throw new Error(
        `Evidence is required for state ${state}. Required fields: ${requiredFields.join(', ')}`
      );
    }

    // For terminal states with no required evidence
    if (requiredFields.length === 0) {
      return true;
    }

    const errors: string[] = [];
    const missingFields: string[] = [];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!(field in evidence) || evidence[field] === null || evidence[field] === undefined) {
        missingFields.push(field);
        continue;
      }

      // Validate field format using AJV
      if (this.compiledSchemas[field]) {
        const isValid = this.compiledSchemas[field](evidence[field]);
        if (!isValid) {
          const fieldErrors = this.compiledSchemas[field].errors || [];

          const errorMessages = fieldErrors.map((error: AjvError) => {
            const fieldName = field;
            const value = error.data;

            switch (error.keyword) {
              case 'minLength':
                return `${fieldName} must be at least ${error.params.limit} characters long (got ${String(value).length})`;
              case 'pattern':
                return `${fieldName} must match the required format (UUID format expected)`;
              case 'minItems':
                return `${fieldName} must contain at least ${error.params.limit} items`;
              case 'type':
                return `${fieldName} must be of type ${error.params.type} (got ${typeof value})`;
              default:
                return `${fieldName}: ${error.message}`;
            }
          });

          errors.push(...errorMessages);
        }
      }

      // Validate review_id against session state for REVIEW_PLAN and REVIEW_IMPLEMENTATION
      if (field === 'review_id' && session) {
        if (state === 'REVIEW_PLAN') {
          // Validate plan review_id matches session and is APPROVED
          if (!session.plan_review_id) {
            errors.push(`No plan review found in session. Submit a plan review first.`);
          } else if (evidence[field] !== session.plan_review_id) {
            errors.push(`review_id does not match session plan_review_id.}, got: ${evidence[field]}`);
          } else if (session.plan_review_state !== 'APPROVED') {
            errors.push(`Plan review verdict must be APPROVED. Current verdict: ${session.plan_review_state}`);
          }
        } else if (state === 'REVIEW_IMPLEMENTATION') {
          // Validate implementation review_id matches session and is APPROVED
          if (!session.implementation_review_id) {
            errors.push(`No implementation review found in session. Submit an implementation review first.`);
          } else if (evidence[field] !== session.implementation_review_id) {
            errors.push(`review_id does not match session implementation_review_id, got: ${evidence[field]}`);
          } else if (session.implementation_review_state !== 'APPROVED') {
            errors.push(`Implementation review verdict must be APPROVED. Current verdict: ${session.implementation_review_state}`);
          }
        }
      }

      // Validate task_ids against session state for DELEGATION
      if (field === 'task_ids' && session && state === 'DELEGATION') {
        const providedTaskIds = evidence[field] as string[] || [];
        const sessionTasks = session.assigned_tasks || {};
        
        
        // Check that session has at least one assigned task
        if (Object.keys(sessionTasks).length === 0) {
          errors.push(`No tasks have been assigned in session - at least one task must be assigned before transitioning from DELEGATION state`);
        }
        // Validate each task_id in evidence exists in session and has valid status
        for (const taskId of providedTaskIds) {
          const task = sessionTasks[taskId];
          if (!task) {
            errors.push(`task_id "${taskId}" does not exist in session`);
            continue;
          }
          
          // Task must be finished (not in 'started' status)
          if (task.status === 'started') {
            errors.push(`task_id "${taskId}" has status "started" - tasks must be completed, cancelled, or aborted before DELEGATION transition`);
            continue;
          }
          
          // Task with aborted status cannot be included in evidence
          if (task.status === 'aborted') {
            errors.push(`task_id "${taskId}" has status "aborted" - aborted tasks cannot be included in evidence`);
            continue;
          }
        }
        
        // Check for orphaned tasks - all completed tasks in session must be included in evidence
        // Aborted tasks cannot be included (they fail above), so we only check for completed tasks
        // Cancelled tasks can be omitted
        for (const [sessionTaskId, task] of Object.entries(sessionTasks)) {
          if (task.status === 'completed' && !providedTaskIds.includes(sessionTaskId)) {
            errors.push(`task_id "${sessionTaskId}" exists in session with status "completed" but was not included in evidence - all completed tasks must be included`);
          }
          // Note: aborted tasks should not be in evidence (checked above) and cancelled tasks can be omitted
        }
      }
      // Validate user_approval_text contains exact phrase for USER_APPROVAL state
      if (field === 'user_approval_text' && state === 'USER_APPROVAL') {
        const approvalText = evidence[field] as string || '';
        // Use regex to match exact phrase "yes i approve" with word boundaries (case insensitive)
        const exactPhraseRegex = /\byes\s+i\s+approve\b/i;
        const containsExactPhrase = exactPhraseRegex.test(approvalText);
        if (!containsExactPhrase) {
          errors.push(`user approval is missing`);
        }
      }
    }

    // Report missing fields
    if (missingFields.length > 0) {
      errors.unshift(`Missing required fields for state ${state}: ${missingFields.join(', ')}`);
    }

    // Throw detailed error if validation failed
    if (errors.length > 0) {
      throw new Error(`Evidence validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }

    return true;
  }

  getAllStates(): StateType[] {
    return Object.keys(STATES) as StateType[];
  }

  isTerminalState(state: StateType): boolean {
    if (!STATES[state]) {
      throw new Error(`Invalid state: ${state}. Valid states are: ${Object.keys(STATES).join(', ')}`);
    }

    return STATES[state].next === null;
  }
}

export default StateMachine;