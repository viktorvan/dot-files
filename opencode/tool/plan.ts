import { tool, type ToolContext } from '@opencode-ai/plugin';
import { SessionManager } from '../lib/session.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import { validateXML } from 'xsd-schema-validator';

// Initialize shared instance
const sessionManager = new SessionManager();

// Path to XSD schema for validation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const planSchemaPath = path.join(__dirname, '../prompts', 'plan_format.xml');

export const plan_add = tool({
  description: 'Add a plan in XML format to a file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to add plan to'),
    plan_xml: tool.schema.string().describe('Plan content in XML format according to plan_format.xml')
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
       try {
         const validationResult = await validateXML(plan_xml, planSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML does not conform to plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed: ${(schemaError as Error).message}`);
       }

      // Write to file in same directory as session file
      const sessionPath = sessionManager._getSessionPath(session_id);
      const sessionDir = path.dirname(sessionPath);
      const filePath = path.join(sessionDir, `${session_id}_plan.xml`);
      await fs.writeFile(filePath, plan_xml, 'utf8');

      return JSON.stringify({
        success: true,
        message: `Plan XML saved to ${filePath} successfully`
      });

    } catch (error) {
      throw new Error(`plan_add failed: ${(error as Error).message}`);
    }
  }
});

export const plan_read = tool({
  description: 'Read the plan XML from the file. Validates XML structure using xml2js.',
  args: {
    session_id: tool.schema.string().describe('Session ID to read plan from')
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
       const filePath = path.join(sessionDir, `${session_id}_plan.xml`);
       const planXml = await fs.readFile(filePath, 'utf8');

       // Validate XML structure using xml2js
       try {
         await parseStringPromise(planXml);
       } catch (parseError) {
         throw new Error(`Invalid XML in file: ${(parseError as Error).message}`);
       }

       // Validate XML against XSD schema
       try {
         const validationResult = await validateXML(planXml, planSchemaPath);
         if (!validationResult.valid) {
           const errorMsg = validationResult.messages ? validationResult.messages.join(', ') : 'Unknown schema validation error';
           throw new Error(`XML in file does not conform to plan schema: ${errorMsg}`);
         }
       } catch (schemaError) {
         throw new Error(`Schema validation failed for file: ${(schemaError as Error).message}`);
       }

      return planXml;

    } catch (error) {
      throw new Error(`plan_read failed: ${(error as Error).message}`);
    }
  }
});
