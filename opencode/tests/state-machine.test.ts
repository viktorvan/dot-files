import { StateMachine } from '../lib/state-machine.js';
import type { StateType, Evidence, Session } from '../lib/types.js';

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  describe('getNextState', () => {
    it('should return correct next state for each valid state', () => {
      expect(stateMachine.getNextState('ANALYSIS')).toBe('PLAN');
      expect(stateMachine.getNextState('PLAN')).toBe('REVIEW_PLAN');
      expect(stateMachine.getNextState('REVIEW_PLAN')).toBe('USER_APPROVAL');
      expect(stateMachine.getNextState('USER_APPROVAL')).toBe('DELEGATION');
      expect(stateMachine.getNextState('DELEGATION')).toBe('REVIEW_IMPLEMENTATION');
      expect(stateMachine.getNextState('REVIEW_IMPLEMENTATION')).toBe('DONE');
      expect(stateMachine.getNextState('DONE')).toBeNull();
    });

    it('should throw error for invalid state', () => {
      expect(() => stateMachine.getNextState('INVALID' as StateType))
        .toThrow('Invalid state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });
  });

  describe('getRequiredEvidence', () => {
    it('should return correct required evidence for each state', () => {
      expect(stateMachine.getRequiredEvidence('ANALYSIS')).toEqual(['clarifying_questions_text', 'clarifying_answers_text']);
      expect(stateMachine.getRequiredEvidence('PLAN')).toEqual(['plan_summary']);
      expect(stateMachine.getRequiredEvidence('REVIEW_PLAN')).toEqual(['review_id']);
      expect(stateMachine.getRequiredEvidence('USER_APPROVAL')).toEqual(['user_approval_text']);
      expect(stateMachine.getRequiredEvidence('DELEGATION')).toEqual(['task_ids']);
      expect(stateMachine.getRequiredEvidence('REVIEW_IMPLEMENTATION')).toEqual(['review_id']);
      expect(stateMachine.getRequiredEvidence('DONE')).toEqual([]);
    });

    it('should return copy of evidence array to prevent mutation', () => {
      const evidence1 = stateMachine.getRequiredEvidence('ANALYSIS');
      const evidence2 = stateMachine.getRequiredEvidence('ANALYSIS');
      
      evidence1.push('modified');
      
      expect(evidence2).toEqual(['clarifying_questions_text', 'clarifying_answers_text']);
    });

    it('should throw error for invalid state', () => {
      expect(() => stateMachine.getRequiredEvidence('INVALID' as StateType))
        .toThrow('Invalid state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });
  });

  describe('validateTransition', () => {
    it('should validate correct state transitions', () => {
      expect(stateMachine.validateTransition('ANALYSIS', 'PLAN')).toBe(true);
      expect(stateMachine.validateTransition('PLAN', 'REVIEW_PLAN')).toBe(true);
      expect(stateMachine.validateTransition('REVIEW_PLAN', 'USER_APPROVAL')).toBe(true);
      expect(stateMachine.validateTransition('USER_APPROVAL', 'DELEGATION')).toBe(true);
      expect(stateMachine.validateTransition('DELEGATION', 'REVIEW_IMPLEMENTATION')).toBe(true);
      expect(stateMachine.validateTransition('REVIEW_IMPLEMENTATION', 'DONE')).toBe(true);
    });

    it('should throw error for invalid current state', () => {
      expect(() => stateMachine.validateTransition('INVALID' as StateType, 'PLAN'))
        .toThrow('Invalid current state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });

    it('should throw error for invalid next state', () => {
      expect(() => stateMachine.validateTransition('ANALYSIS', 'INVALID' as StateType))
        .toThrow('Invalid next state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });

    it('should throw error for invalid transitions', () => {
      expect(() => stateMachine.validateTransition('ANALYSIS', 'DELEGATION'))
        .toThrow('Invalid state transition: cannot go from ANALYSIS to DELEGATION. Expected next state: PLAN');
      
      expect(() => stateMachine.validateTransition('PLAN', 'USER_APPROVAL'))
        .toThrow('Invalid state transition: cannot go from PLAN to USER_APPROVAL. Expected next state: REVIEW_PLAN');
    });

    it('should throw error when transitioning from terminal state', () => {
      expect(() => stateMachine.validateTransition('DONE', 'ANALYSIS'))
        .toThrow('Cannot transition from terminal state: DONE');
    });
  });

  describe('validateEvidence', () => {
    describe('ANALYSIS state', () => {
      it('should validate correct ANALYSIS evidence', () => {
        const evidence: Evidence = {
          clarifying_questions_text: 'What are the requirements?',
          clarifying_answers_text: 'The requirements are XYZ'
        };

        expect(stateMachine.validateEvidence('ANALYSIS', evidence)).toBe(true);
      });

      it('should throw error for missing clarifying_questions_text', () => {
        const evidence: Evidence = {
          clarifying_answers_text: 'The requirements are XYZ'
        };

        expect(() => stateMachine.validateEvidence('ANALYSIS', evidence))
          .toThrow('Missing required fields for state ANALYSIS: clarifying_questions_text');
      });

      it('should throw error for short clarifying_questions_text', () => {
        const evidence: Evidence = {
          clarifying_questions_text: 'Short',
          clarifying_answers_text: 'The requirements are XYZ'
        };

        expect(() => stateMachine.validateEvidence('ANALYSIS', evidence))
          .toThrow('clarifying_questions_text must be at least 10 characters long (got 5)');
      });
    });

    describe('PLAN state', () => {
      it('should validate correct PLAN evidence', () => {
        const evidence: Evidence = {
          plan_summary: 'This is a comprehensive plan for the project'
        };

        expect(stateMachine.validateEvidence('PLAN', evidence)).toBe(true);
      });

      it('should throw error for short plan_summary', () => {
        const evidence: Evidence = {
          plan_summary: 'Short plan'
        };

        expect(() => stateMachine.validateEvidence('PLAN', evidence))
          .toThrow('plan_summary must be at least 20 characters long (got 10)');
      });
    });

    describe('REVIEW_PLAN state', () => {
      it('should validate correct REVIEW_PLAN evidence with session context', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_PLAN',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: '12345678-1234-1234-1234-123456789abc',
          implementation_review_id: null,
          plan_review_state: 'APPROVED',
          validation_failures: [],
          transition_failures: []
        };

        expect(stateMachine.validateEvidence('REVIEW_PLAN', evidence, session)).toBe(true);
      });

      it('should throw error for invalid UUID format', () => {
        const evidence: Evidence = {
          review_id: 'invalid-uuid'
        };

        expect(() => stateMachine.validateEvidence('REVIEW_PLAN', evidence))
          .toThrow('review_id must match the required format (UUID format expected)');
      });

      it('should throw error when no plan review in session', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_PLAN',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('REVIEW_PLAN', evidence, session))
          .toThrow('No plan review found in session. Submit a plan review first.');
      });

      it('should throw error when review_id does not match session', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_PLAN',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: '87654321-4321-4321-4321-cba987654321',
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('REVIEW_PLAN', evidence, session))
          .toThrow('review_id does not match session plan_review_id. Expected: 87654321-4321-4321-4321-cba987654321, got: 12345678-1234-1234-1234-123456789abc');
      });

      it('should throw error when plan review is not approved', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_PLAN',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: '12345678-1234-1234-1234-123456789abc',
          implementation_review_id: null,
          plan_review_state: 'REJECTED',
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('REVIEW_PLAN', evidence, session))
          .toThrow('Plan review verdict must be APPROVED. Current verdict: REJECTED');
      });
    });

    describe('USER_APPROVAL state', () => {
      it('should validate correct USER_APPROVAL evidence', () => {
        const evidence: Evidence = {
          user_approval_text: 'yes i approve this plan'
        };

        expect(stateMachine.validateEvidence('USER_APPROVAL', evidence)).toBe(true);
      });

      it('should validate case insensitive approval phrase', () => {
        const evidence: Evidence = {
          user_approval_text: 'YES I APPROVE this plan completely'
        };

        expect(stateMachine.validateEvidence('USER_APPROVAL', evidence)).toBe(true);
      });

      it('should throw error when approval phrase is missing', () => {
        const evidence: Evidence = {
          user_approval_text: 'I agree with this plan'
        };

        expect(() => stateMachine.validateEvidence('USER_APPROVAL', evidence))
          .toThrow('user approval is missing');
      });
    });

    describe('DELEGATION state', () => {
      it('should validate correct DELEGATION evidence with session context', () => {
        const evidence: Evidence = {
          task_ids: ['task-1', 'task-2']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'completed' },
            'task-2': { status: 'completed' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(stateMachine.validateEvidence('DELEGATION', evidence, session)).toBe(true);
      });

      it('should throw error for empty task_ids array', () => {
        const evidence: Evidence = {
          task_ids: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence))
          .toThrow('task_ids must contain at least 1 items');
      });

      it('should throw error when no tasks assigned in session', () => {
        const evidence: Evidence = {
          task_ids: ['task-1']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence, session))
          .toThrow('No tasks have been assigned in session - at least one task must be assigned before transitioning from DELEGATION state');
      });

      it('should throw error for non-existent task_id', () => {
        const evidence: Evidence = {
          task_ids: ['non-existent-task']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'completed' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence, session))
          .toThrow('task_id "non-existent-task" does not exist in session');
      });

      it('should throw error for task with started status', () => {
        const evidence: Evidence = {
          task_ids: ['task-1']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'started' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence, session))
          .toThrow('task_id "task-1" has status "started" - tasks must be completed, cancelled, or aborted before DELEGATION transition');
      });

      it('should throw error for task with aborted status', () => {
        const evidence: Evidence = {
          task_ids: ['task-1']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'aborted' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence, session))
          .toThrow('task_id "task-1" has status "aborted" - aborted tasks cannot be included in evidence');
      });

      it('should allow cancelled tasks to be omitted from evidence', () => {
        const evidence: Evidence = {
          task_ids: ['task-1']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'completed' },
            'task-2': { status: 'cancelled' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(stateMachine.validateEvidence('DELEGATION', evidence, session)).toBe(true);
      });

      it('should throw error when completed task is omitted from evidence', () => {
        const evidence: Evidence = {
          task_ids: ['task-1']
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'DELEGATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {
            'task-1': { status: 'completed' },
            'task-2': { status: 'completed' }
          },
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('DELEGATION', evidence, session))
          .toThrow('task_id "task-2" exists in session with status "completed" but was not included in evidence - all completed tasks must be included');
      });
    });

    describe('REVIEW_IMPLEMENTATION state', () => {
      it('should validate correct REVIEW_IMPLEMENTATION evidence with session context', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_IMPLEMENTATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: null,
          implementation_review_id: '12345678-1234-1234-1234-123456789abc',
          implementation_review_state: 'APPROVED',
          validation_failures: [],
          transition_failures: []
        };

        expect(stateMachine.validateEvidence('REVIEW_IMPLEMENTATION', evidence, session)).toBe(true);
      });

      it('should throw error when no implementation review in session', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_IMPLEMENTATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: null,
          implementation_review_id: null,
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('REVIEW_IMPLEMENTATION', evidence, session))
          .toThrow('No implementation review found in session. Submit an implementation review first.');
      });

      it('should throw error when implementation review is not approved', () => {
        const evidence: Evidence = {
          review_id: '12345678-1234-1234-1234-123456789abc'
        };

        const session: Session = {
          session_id: 'test',
          current_state: 'REVIEW_IMPLEMENTATION',
          state_id: 'state123',
          state_history: [],
          created_at: '2025-09-26T00:00:00Z',
          updated_at: '2025-09-26T00:00:00Z',
          assigned_tasks: {},
          plan_review_id: null,
          implementation_review_id: '12345678-1234-1234-1234-123456789abc',
          implementation_review_state: 'REJECTED',
          validation_failures: [],
          transition_failures: []
        };

        expect(() => stateMachine.validateEvidence('REVIEW_IMPLEMENTATION', evidence, session))
          .toThrow('Implementation review verdict must be APPROVED. Current verdict: REJECTED');
      });
    });

    describe('DONE state', () => {
      it('should validate DONE state with no required evidence', () => {
        expect(stateMachine.validateEvidence('DONE', {})).toBe(true);
      });
    });

    it('should throw error for invalid state', () => {
      expect(() => stateMachine.validateEvidence('INVALID' as StateType, {}))
        .toThrow('Invalid state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });

    it('should throw error when evidence is missing for states that require it', () => {
      expect(() => stateMachine.validateEvidence('ANALYSIS', null as any))
        .toThrow('Evidence is required for state ANALYSIS. Required fields: clarifying_questions_text, clarifying_answers_text');
    });
  });

  describe('getAllStates', () => {
    it('should return all valid states', () => {
      const states = stateMachine.getAllStates();
      
      expect(states).toEqual([
        'ANALYSIS',
        'PLAN',
        'REVIEW_PLAN',
        'USER_APPROVAL',
        'DELEGATION',
        'REVIEW_IMPLEMENTATION',
        'DONE'
      ]);
    });
  });

  describe('isTerminalState', () => {
    it('should return true only for DONE state', () => {
      expect(stateMachine.isTerminalState('ANALYSIS')).toBe(false);
      expect(stateMachine.isTerminalState('PLAN')).toBe(false);
      expect(stateMachine.isTerminalState('REVIEW_PLAN')).toBe(false);
      expect(stateMachine.isTerminalState('USER_APPROVAL')).toBe(false);
      expect(stateMachine.isTerminalState('DELEGATION')).toBe(false);
      expect(stateMachine.isTerminalState('REVIEW_IMPLEMENTATION')).toBe(false);
      expect(stateMachine.isTerminalState('DONE')).toBe(true);
    });

    it('should throw error for invalid state', () => {
      expect(() => stateMachine.isTerminalState('INVALID' as StateType))
        .toThrow('Invalid state: INVALID. Valid states are: ANALYSIS, PLAN, REVIEW_PLAN, USER_APPROVAL, DELEGATION, REVIEW_IMPLEMENTATION, DONE');
    });
  });
});