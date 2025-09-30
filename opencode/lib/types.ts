// Type definitions for the delegating state manager

export type StateType = 'ANALYSIS' | 'PLAN' | 'REVIEW_PLAN' | 'USER_APPROVAL' | 'DELEGATION' | 'REVIEW_IMPLEMENTATION' | 'DONE';

export type TaskStatus = 'started' | 'completed' | 'cancelled' | 'aborted';

export type ReviewState = 'APPROVED' | 'REJECTED' | 'PENDING';

export interface Task {
  status: TaskStatus;
  [key: string]: any; // Allow additional task properties
}

export interface ValidationFailure {
  timestamp: string;
  type: string;
  details: string;
  expected_state?: string;
  attempted_state?: string;
}

export interface TransitionFailure {
  timestamp: string;
  type: string;
  details: string;
  attempted_transition?: string;
}

export interface StateHistoryRecord {
  state?: StateType;
  state_id?: string;
  from_state?: StateType;
  to_state?: StateType;
  to_state_id?: string;
  evidence?: any;
  notes?: string;
  transition_type?: string;
  timestamp: string;
}

export interface Session {
  session_id: string;
  current_state: StateType;
  state_id: string;
  state_history: StateHistoryRecord[];
  created_at: string;
  updated_at: string;
  assigned_tasks: Record<string, Task>;
  plan_review_id: string | null;
  implementation_review_id: string | null;
  plan_review_state?: ReviewState;
  implementation_review_state?: ReviewState;
  validation_failures: ValidationFailure[];
  transition_failures: TransitionFailure[];
}

export interface StateDefinition {
  next: StateType | null;
  evidence: string[];
}

export interface Evidence {
  clarifying_questions_text?: string;
  clarifying_answers_text?: string;
  plan_summary?: string;
  review_id?: string;
  user_approval_text?: string;
  task_ids?: string[];
  [key: string]: any; // Allow additional evidence properties
}

export interface EvidenceSchema {
  type: string;
  minLength?: number;
  pattern?: string;
  items?: {
    type: string;
    minLength?: number;
  };
  minItems?: number;
  description: string;
}

export interface AjvError {
  keyword: string;
  data: any;
  params: Record<string, any>;
  message?: string;
}

export interface CompiledValidator {
  (data: any): boolean;
  errors?: AjvError[];
}