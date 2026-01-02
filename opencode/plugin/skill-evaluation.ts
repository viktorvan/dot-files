import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"

const CHECKPOINT_INTERVAL = parseInt(process.env.SKILL_CHECK_INTERVAL || "10")
const LOG_FILE = join(homedir(), ".opencode-skill-evaluation.log")

function log(message: string, sessionId: string, count?: number) {
  const timestamp = new Date().toISOString()
  const countSuffix = count !== undefined ? ` (count: ${count})` : ""
  appendFileSync(LOG_FILE, `[${timestamp}] ${sessionId}: ${message}${countSuffix}\n`)
}

export const SkillEvaluationPlugin: Plugin = async ({ client }) => {
  const sessions = new Map<string, Set<string>>()
  
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        const sessionId = event.properties.info.id
        sessions.set(sessionId, new Set())
        log("Invoking /evaluate-skills", sessionId)
        await client.session.command({
          path: { id: sessionId },
          body: { command: "evaluate-skills", arguments: "" }
        })
        return
      }
      
      if (event.type === "message.updated") {
        const msg = event.properties.info
        if (msg.role !== "user") return
        
        const messageIds = sessions.get(msg.sessionID) || new Set()
        if (messageIds.has(msg.id)) return
        
        messageIds.add(msg.id)
        sessions.set(msg.sessionID, messageIds)
        const count = messageIds.size
        
        log("User message", msg.sessionID, count)
        
        if (count % CHECKPOINT_INTERVAL === 0) {
          log("Invoking /reevaluate-skills", msg.sessionID, count)
          await client.session.command({
            path: { id: msg.sessionID },
            body: { command: "reevaluate-skills", arguments: "" }
          })
        }
      }
    }
  }
}
