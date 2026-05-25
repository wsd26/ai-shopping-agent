import { v4 as uuidv4 } from 'uuid'
import type {
  AgentMessage,
  AgentMessageType,
  AgentType,
  BusEventHandler,
  ShoppingAgent,
} from './types'

// ====== Agent Communication Bus ======
// Central nervous system of the multi-agent architecture.
// All inter-agent messages pass through this bus.
// Enables: routing, logging, conflict detection, and future extensibility.

export class AgentBus {
  private agents = new Map<AgentType, ShoppingAgent>()
  private handlers = new Map<AgentMessageType, Set<BusEventHandler>>()
  private messageLog: AgentMessage[] = []
  private pendingConflicts: AgentMessage[] = []
  private uiHandler: ((msg: AgentMessage) => void) | null = null

  // Register an agent with the bus
  register(agent: ShoppingAgent): void {
    this.agents.set(agent.info.type, agent)
    console.log(
      `[AgentBus] Registered ${agent.info.name} (${agent.info.type}) - ${agent.info.description}`
    )
  }

  // Subscribe to specific message types
  on(type: AgentMessageType, handler: BusEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)?.delete(handler)
  }

  // Set UI handler for rendering agent messages
  onUI(handler: (msg: AgentMessage) => void): void {
    this.uiHandler = handler
  }

  // Send a message through the bus
  async dispatch(msg: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage> {
    const fullMsg: AgentMessage = {
      ...msg,
      id: uuidv4(),
      timestamp: Date.now(),
    }

    this.messageLog.push(fullMsg)
    if (this.messageLog.length > 200) this.messageLog.shift()

    console.log(
      `[AgentBus] ${fullMsg.from} → ${fullMsg.to} [${fullMsg.type}] priority:${fullMsg.priority}`
    )

    // Conflict detection: if Monitor wants to push (high priority) while user is interacting
    if (
      fullMsg.type === 'monitor_alert' &&
      fullMsg.priority === 'high' &&
      this.hasRecentUserInteraction(3000)
    ) {
      this.pendingConflicts.push(fullMsg)
      console.log('[AgentBus] ⚠️ Conflict: Monitor alert queued (user recently active)')
      return fullMsg
    }

    // Route to target agent
    const targetAgent = this.agents.get(fullMsg.to as AgentType)
    if (targetAgent) {
      try {
        const response = await targetAgent.handleMessage(fullMsg)
        if (response) {
          this.dispatch({
            from: targetAgent.info.type,
            to: response.to,
            type: response.type,
            payload: response.payload,
            priority: response.priority,
          })
        }
      } catch (err) {
        console.error(`[AgentBus] Error in ${fullMsg.to}:`, err)
      }
    }

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(fullMsg.type)
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(fullMsg)
        } catch (err) {
          console.error('[AgentBus] Handler error:', err)
        }
      }
    }

    // Notify UI handler for agent_response and status_update
    if (
      (fullMsg.type === 'agent_response' || fullMsg.type === 'status_update') &&
      this.uiHandler
    ) {
      this.uiHandler(fullMsg)
    }

    return fullMsg
  }

  // Flush pending conflicts (called when user goes idle)
  flushPendingConflicts(): AgentMessage[] {
    const conflicts = [...this.pendingConflicts]
    this.pendingConflicts = []
    for (const msg of conflicts) {
      this.dispatch({
        from: msg.from,
        to: msg.to,
        type: msg.type,
        payload: msg.payload,
        priority: 'normal',
      })
    }
    return conflicts
  }

  // Check if user interacted recently
  hasRecentUserInteraction(windowMs: number): boolean {
    const recent = this.messageLog.filter(
      (m) =>
        m.type === 'user_input' &&
        Date.now() - m.timestamp < windowMs
    )
    return recent.length > 0
  }

  // Get agent by type
  getAgent(type: AgentType): ShoppingAgent | undefined {
    return this.agents.get(type)
  }

  // Get recent messages for debugging
  getRecentLog(count: number = 20): AgentMessage[] {
    return this.messageLog.slice(-count)
  }

  // Reset all agents
  resetAll(): void {
    for (const agent of this.agents.values()) {
      agent.reset()
    }
    this.pendingConflicts = []
    console.log('[AgentBus] All agents reset')
  }
}

// Singleton instance
export const agentBus = new AgentBus()
