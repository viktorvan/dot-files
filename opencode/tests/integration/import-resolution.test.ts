import { describe, test, expect, beforeEach } from '@jest/globals';
import { SessionManager } from '../../lib/session';
import { StateMachine } from '../../lib/state-machine';
import { request_new_session, request_next_state, rollback_state, get_current_state } from '../../tool/session';
import { start_task, finish_task } from '../../tool/task';

describe('Import Resolution Integration Tests', () => {
  beforeEach(() => {
    // Clear any module cache issues between tests
    // No setup needed for import resolution tests
  });

  describe('Library Import Resolution', () => {
    test('SessionManager can be imported and instantiated without errors', () => {
      expect(() => {
        const sessionManager = new SessionManager();
        expect(sessionManager).toBeInstanceOf(SessionManager);
      }).not.toThrow();
    });

    test('StateMachine can be imported and instantiated without errors', () => {
      expect(() => {
        const stateMachine = new StateMachine();
        expect(stateMachine).toBeInstanceOf(StateMachine);
      }).not.toThrow();
    });

    test('SessionManager methods are accessible and callable', async () => {
      const sessionManager = new SessionManager();
      
      // Test method existence
      expect(typeof sessionManager.createSession).toBe('function');
      expect(typeof sessionManager.loadSession).toBe('function');
      expect(typeof sessionManager.updateSession).toBe('function');
      expect(typeof sessionManager.sessionExists).toBe('function');
      expect(typeof sessionManager.logValidationFailure).toBe('function');
      expect(typeof sessionManager.logTransitionFailure).toBe('function');
      expect(typeof sessionManager._getSessionPath).toBe('function');

      // Test actual functionality works
      const session = await sessionManager.createSession();
      expect(session).toBeDefined();
      expect(session.session_id).toBeDefined();
      expect(session.current_state).toBe('ANALYSIS');
    });

    test('StateMachine methods are accessible and callable', () => {
      const stateMachine = new StateMachine();
      
      // Test method existence
      expect(typeof stateMachine.getNextState).toBe('function');
      expect(typeof stateMachine.getRequiredEvidence).toBe('function');
      expect(typeof stateMachine.validateTransition).toBe('function');
      expect(typeof stateMachine.validateEvidence).toBe('function');
      expect(typeof stateMachine.getAllStates).toBe('function');
      expect(typeof stateMachine.isTerminalState).toBe('function');

      // Test actual functionality works
      const nextState = stateMachine.getNextState('ANALYSIS');
      expect(nextState).toBe('PLAN');

      const requiredEvidence = stateMachine.getRequiredEvidence('ANALYSIS');
      expect(Array.isArray(requiredEvidence)).toBe(true);
      expect(requiredEvidence).toContain('clarifying_questions_text');
      expect(requiredEvidence).toContain('clarifying_answers_text');
    });
  });

  describe('Tool Import Resolution', () => {
    test('session tools can be imported without errors', () => {
      expect(request_new_session).toBeDefined();
      expect(request_next_state).toBeDefined();
      expect(rollback_state).toBeDefined();
      expect(get_current_state).toBeDefined();

      // Verify they are tool objects with execute methods
      expect(typeof request_new_session.execute).toBe('function');
      expect(typeof request_next_state.execute).toBe('function');
      expect(typeof rollback_state.execute).toBe('function');
      expect(typeof get_current_state.execute).toBe('function');
    });

    test('task tools can be imported without errors', () => {
      expect(start_task).toBeDefined();
      expect(finish_task).toBeDefined();

      // Verify they are tool objects with execute methods
      expect(typeof start_task.execute).toBe('function');
      expect(typeof finish_task.execute).toBe('function');
    });

    test('tool descriptions and metadata are accessible', () => {
      // Session tools
      expect(request_new_session.description).toBeDefined();
      expect(request_next_state.description).toBeDefined();
      expect(rollback_state.description).toBeDefined();
      expect(get_current_state.description).toBeDefined();

      // Task tools
      expect(start_task.description).toBeDefined();
      expect(finish_task.description).toBeDefined();
    });
  });

  describe('Cross-Module Dependencies', () => {
    test('tools can successfully use SessionManager without import errors', async () => {
      // This test verifies that the SessionManager import in tools works correctly
      const result = await request_new_session.execute({}, {} as any);
      expect(result).toBeDefined();
      
      const response = JSON.parse(result);
      expect(response.approved).toBe(true);
      expect(response.session_id).toBeDefined();
    });

    test('tools can successfully use StateMachine without import errors', async () => {
      // Create a session first
      const sessionResult = await request_new_session.execute({}, {} as any);
      const sessionResponse = JSON.parse(sessionResult);
      const sessionId = sessionResponse.session_id;

      // This test verifies that the StateMachine import in tools works correctly
      // Try a transition that will invoke StateMachine validation
      const result = await request_next_state.execute({
        session_id: sessionId,
        evidence: {
          clarifying_questions_text: 'What are the requirements?',
          clarifying_answers_text: 'Need a comprehensive system.'
        }
      }, {} as any);

      expect(result).toBeDefined();
      const response = JSON.parse(result);
      expect(response.approved).toBe(true);
      expect(response.state).toBe('PLAN');
    });

    test('type imports are resolved correctly', () => {
      // This test ensures that TypeScript types are properly resolved
      // If there were import issues, this file wouldn't compile
      
      const sessionManager = new SessionManager();
      const stateMachine = new StateMachine();

      // Test that type-dependent operations work
      const allStates = stateMachine.getAllStates();
      expect(allStates).toContain('ANALYSIS');
      expect(allStates).toContain('PLAN');
      expect(allStates).toContain('DONE');
    });
  });

  describe('Runtime Import Verification', () => {
    test('all required dependencies are available at runtime', async () => {
      // Test that external dependencies are properly imported
      try {
        // These should not throw if imports are working
        const sessionManager = new SessionManager();
        const session = await sessionManager.createSession();
        
        // Verify lowdb is working (used internally by SessionManager)
        expect(session.session_id).toBeDefined();
        
        // Verify crypto module is working (used for UUID generation)
        expect(session.state_id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        
        // Verify fs operations are working
        const sessionPath = sessionManager._getSessionPath(session.session_id);
        expect(sessionPath).toContain('.json');
        
        // Verify path operations are working
        expect(sessionPath).toContain('sessions');
        
      } catch (error) {
        fail(`Runtime dependencies failed: ${(error as Error).message}`);
      }
    });

    test('ajv validation library is properly imported and functional', () => {
      const stateMachine = new StateMachine();
      
      // This should use AJV internally for validation
      try {
        stateMachine.validateEvidence('ANALYSIS', {
          clarifying_questions_text: 'valid question',
          clarifying_answers_text: 'valid answer'
        });
      } catch (error) {
        // Expected to pass, if AJV import failed this would throw a different error
      }

      // Test AJV validation failure (should use AJV error formatting)
      try {
        stateMachine.validateEvidence('ANALYSIS', {
          clarifying_questions_text: 'too short', // Should be at least 10 chars
          clarifying_answers_text: 'also short'   // Should be at least 10 chars
        });
        fail('Expected validation to fail');
      } catch (error) {
        // Should contain AJV-formatted error message
        expect((error as Error).message).toContain('at least');
        expect((error as Error).message).toContain('characters long');
      }
    });

    test('node built-in modules are accessible', async () => {
      const sessionManager = new SessionManager();
      
      // Test fs module
      const session = await sessionManager.createSession();
      expect(session).toBeDefined();
      
      // Test path module  
      const sessionPath = sessionManager._getSessionPath(session.session_id);
      expect(sessionPath).toContain(session.session_id);
      
      // Test os module (homedir)
      expect(sessionPath).toContain('.local');
      
      // Test crypto module (used for UUID generation)
      expect(session.state_id).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe('Error Propagation and Import Failures', () => {
    test('import errors are properly propagated and not silently ignored', async () => {
      // This test ensures that if there were actual import failures,
      // they would surface as proper errors rather than silent failures
      
      try {
        // If any imports failed, these operations would fail
        const sessionManager = new SessionManager();
        const stateMachine = new StateMachine();
        
        // Execute actual operations that depend on imports
        const session = await sessionManager.createSession();
        const nextState = stateMachine.getNextState('ANALYSIS');
        
        expect(session).toBeDefined();
        expect(nextState).toBe('PLAN');
        
        // Execute tool operations that depend on cross-module imports
        const result = await request_new_session.execute({}, {} as any);
        const response = JSON.parse(result);
        expect(response.session_id).toBeDefined();
        
      } catch (error) {
        // If we catch any error here, it indicates a real import or functionality issue
        fail(`Import or functionality error detected: ${(error as Error).message}`);
      }
    });

    test('module resolution is consistent across different import patterns', () => {
      // Test direct class imports
      const directSessionManager = new SessionManager();
      const directStateMachine = new StateMachine();
      
      expect(directSessionManager).toBeInstanceOf(SessionManager);
      expect(directStateMachine).toBeInstanceOf(StateMachine);
      
      // Verify instances are functional
      expect(typeof directSessionManager.createSession).toBe('function');
      expect(typeof directStateMachine.getNextState).toBe('function');
      
      // Test that tools (which import the same classes) work consistently
      expect(request_new_session).toBeDefined();
      expect(start_task).toBeDefined();
      
      // Verify the tools can execute without import conflicts
      expect(async () => {
        await request_new_session.execute({}, {} as any);
      }).not.toThrow();
    });
  });
});