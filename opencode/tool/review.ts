import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { StateMachine } from '../lib/state-machine.js';
import type { ReviewState } from '../lib/types.js';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import { validateXML } from 'xsd-schema-validator';

// Initialize shared instances
const sessionManager = new SessionManager();
const stateMachine = new StateMachine();

// Get directory for schema paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const submit_review = tool({
  description: 'Submit review for plan or implementation with verdict tracking',
  args: {
    session_id: tool.schema.string().describe('Session identifier'),
    review_type: tool.schema.string().describe('Type of review: PLAN or IMPLEMENTATION'),
    verdict: tool.schema.string().describe('Review verdict: APPROVED, REJECTED, or NEEDS_REVISION')
  },
  async execute(args: { session_id: string; review_type: string; verdict: string }, _context: ToolContext) {
    try {
      const { session_id, review_type, verdict } = args;
      
      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }
      
      // Validate review_type
      if (!['PLAN', 'IMPLEMENTATION'].includes(review_type.toUpperCase())) {
        throw new Error(`Invalid review_type: ${review_type}. Must be PLAN or IMPLEMENTATION`);
      }
      
      // Validate verdict  
      if (!['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(verdict.toUpperCase())) {
        throw new Error(`Invalid verdict: ${verdict}. Must be APPROVED, REJECTED, or NEEDS_REVISION`);
      }
      
      // Load session
      const sessionData = await sessionManager.loadSession(session_id);
      
      // Generate review ID
      const reviewId = randomUUID();
      
      // Update session data with review
      let updateData;
      if (review_type.toUpperCase() === 'PLAN') {
        updateData = {
          plan_review_id: reviewId,
          plan_review_state: verdict.toUpperCase() as ReviewState
        };
      } else { // IMPLEMENTATION
        updateData = {
          implementation_review_id: reviewId,
          implementation_review_state: verdict.toUpperCase() as ReviewState
        };
      }
      
      await sessionManager.updateSession(session_id, updateData);
      
      return JSON.stringify({
        success: true,
        review_id: reviewId,
        review_type: review_type.toUpperCase(),
        verdict: verdict.toUpperCase(),
        session: sessionManager._getSessionPath(session_id)
      });
      
    } catch (error) {
      throw new Error(`submit_review failed: ${(error as Error).message}`);
    }
  }
});

export const review_plan_add = tool({
  description: 'Add a review plan in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add review plan to'),
    plan_xml: tool.schema.string().describe('Review plan content in XML format according to review_plan_format.xml')
  },
  async execute(args: { session_id: string; plan_xml: string }, _context: ToolContext) {
    try {
      const { session_id, plan_xml } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      if (!plan_xml) {
        throw new Error('Missing required parameter: plan_xml');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(plan_xml);
       } catch (parseError) {
         throw new Error(`Invalid XML: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewPlanSchemaPath = path.join(__dirname, '../prompts', 'review_plan_format.xml');
       try {
         const validationResult = await validateXML(plan_xml, reviewPlanSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML does not conform to review plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
       }

      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_plan_review.xml`);
      await fs.writeFile(filePath, plan_xml, 'utf8');

      return JSON.stringify({
        success: true,
        message: `Review plan XML saved to ${filePath} successfully`
      });

    } catch (error) {
      throw new Error(`review_plan_add failed: ${(error as Error).message}`);
    }
  }
});

export const review_plan_read = tool({
  description: 'Read the review plan XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read review plan from')
  },
  async execute(args: { session_id: string }, _context: ToolContext) {
    try {
      const { session_id } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Read from file in same directory as session file
       const sessionPath = sessionManager._getSessionPath(session_id);
       const sessionDir = path.dirname(sessionPath);
       const filePath = path.join(sessionDir, `${session_id}_plan_review.xml`);
       const planXml = await fs.readFile(filePath, 'utf8');

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(planXml);
       } catch (parseError) {
         throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewPlanSchemaPath = path.join(__dirname, '../prompts', 'review_plan_format.xml');
       try {
         const validationResult = await validateXML(planXml, reviewPlanSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML in file does not conform to review plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
       }

      return planXml;

    } catch (error) {
      throw new Error(`review_plan_read failed: ${(error as Error).message}`);
    }
  }
});

export const review_implementation_add = tool({
  description: 'Add a review implementation in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add review implementation to'),
    plan_xml: tool.schema.string().describe('Review implementation content in XML format according to review_impl_format.xml')
  },
  async execute(args: { session_id: string; plan_xml: string }, _context: ToolContext) {
    try {
      const { session_id, plan_xml } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      if (!plan_xml) {
        throw new Error('Missing required parameter: plan_xml');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(plan_xml);
       } catch (parseError) {
         throw new Error(`Invalid XML: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewImplSchemaPath = path.join(__dirname, '../prompts', 'review_impl_format.xml');
       try {
         const validationResult = await validateXML(plan_xml, reviewImplSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML does not conform to review implementation schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
       }

      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_implementation_review.xml`);
      await fs.writeFile(filePath, plan_xml, 'utf8');

      return JSON.stringify({
        success: true,
        message: `Review implementation XML saved to ${filePath} successfully`
      });

    } catch (error) {
      throw new Error(`review_implementation_add failed: ${(error as Error).message}`);
    }
  }
});

export const review_implementation_read = tool({
  description: 'Read the review implementation XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read review implementation from')
  },
  async execute(args: { session_id: string }, _context: ToolContext) {
    try {
      const { session_id } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Read from file in same directory as session file
       const sessionPath = sessionManager._getSessionPath(session_id);
       const sessionDir = path.dirname(sessionPath);
       const filePath = path.join(sessionDir, `${session_id}_implementation_review.xml`);
       const planXml = await fs.readFile(filePath, 'utf8');

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(planXml);
       } catch (parseError) {
         throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewImplSchemaPath = path.join(__dirname, '../prompts', 'review_impl_format.xml');
       try {
         const validationResult = await validateXML(planXml, reviewImplSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML in file does not conform to review implementation schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
       }

      return planXml;

    } catch (error) {
      throw new Error(`review_implementation_read failed: ${(error as Error).message}`);
    }
  }
});

// New functions added as per task
export const review_review_plan_add = tool({
  description: 'Add a review plan in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add review plan to'),
    plan_xml: tool.schema.string().describe('Review plan content in XML format according to review_plan_format.xml')
  },
  async execute(args: { session_id: string; plan_xml: string }, _context: ToolContext) {
    try {
      const { session_id, plan_xml } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      if (!plan_xml) {
        throw new Error('Missing required parameter: plan_xml');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(plan_xml);
       } catch (parseError) {
         throw new Error(`Invalid XML: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewPlanSchemaPath = path.join(__dirname, '../prompts', 'review_plan_format.xml');
       try {
         const validationResult = await validateXML(plan_xml, reviewPlanSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML does not conform to review plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
       }

      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_plan_review.xml`);
      await fs.writeFile(filePath, plan_xml, 'utf8');

      return JSON.stringify({
        success: true,
        message: `Review plan XML saved to ${filePath} successfully`
      });

    } catch (error) {
      throw new Error(`review_review_plan_add failed: ${(error as Error).message}`);
    }
  }
});

export const review_review_plan_read = tool({
  description: 'Read the review plan XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read review plan from')
  },
  async execute(args: { session_id: string }, _context: ToolContext) {
    try {
      const { session_id } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Read from file in same directory as session file
       const sessionPath = sessionManager._getSessionPath(session_id);
       const sessionDir = path.dirname(sessionPath);
       const filePath = path.join(sessionDir, `${session_id}_plan_review.xml`);
       const planXml = await fs.readFile(filePath, 'utf8');

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(planXml);
       } catch (parseError) {
         throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewPlanSchemaPath = path.join(__dirname, '../prompts', 'review_plan_format.xml');
       try {
         const validationResult = await validateXML(planXml, reviewPlanSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML in file does not conform to review plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
       }

      return planXml;

    } catch (error) {
      throw new Error(`review_review_plan_read failed: ${(error as Error).message}`);
    }
  }
});

export const review_review_implementation_add = tool({
  description: 'Add a review implementation in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add review implementation to'),
    plan_xml: tool.schema.string().describe('Review implementation content in XML format according to review_impl_format.xml')
  },
  async execute(args: { session_id: string; plan_xml: string }, _context: ToolContext) {
    try {
      const { session_id, plan_xml } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      if (!plan_xml) {
        throw new Error('Missing required parameter: plan_xml');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(plan_xml);
       } catch (parseError) {
         throw new Error(`Invalid XML: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewImplSchemaPath = path.join(__dirname, '../prompts', 'review_impl_format.xml');
       try {
         const validationResult = await validateXML(plan_xml, reviewImplSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML does not conform to review implementation schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
       }

      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_implementation_review.xml`);
      await fs.writeFile(filePath, plan_xml, 'utf8');

      return JSON.stringify({
        success: true,
        message: `Review implementation XML saved to ${filePath} successfully`
      });

    } catch (error) {
      throw new Error(`review_review_implementation_add failed: ${(error as Error).message}`);
    }
  }
});

export const review_review_implementation_read = tool({
  description: 'Read the review implementation XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read review implementation from')
  },
  async execute(args: { session_id: string }, _context: ToolContext) {
    try {
      const { session_id } = args;

      if (!session_id) {
        throw new Error('Missing required parameter: session_id');
      }

      // Load session to validate it exists
      await sessionManager.loadSession(session_id);

       // Read from file in same directory as session file
       const sessionPath = sessionManager._getSessionPath(session_id);
       const sessionDir = path.dirname(sessionPath);
       const filePath = path.join(sessionDir, `${session_id}_implementation_review.xml`);
       const planXml = await fs.readFile(filePath, 'utf8');

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(planXml);
       } catch (parseError) {
         throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       const reviewImplSchemaPath = path.join(__dirname, '../prompts', 'review_impl_format.xml');
       try {
         const validationResult = await validateXML(planXml, reviewImplSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML in file does not conform to review implementation schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
       }

      return planXml;

    } catch (error) {
      throw new Error(`review_review_implementation_read failed: ${(error as Error).message}`);
    }
  }
});