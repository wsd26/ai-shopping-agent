import { agentBus } from './AgentBus'
import { orchestratorAgent } from './OrchestratorAgent'
import { monitorAgent } from './MonitorAgent'
import { advisorAgent } from './AdvisorAgent'
import { executorAgent } from './ExecutorAgent'

// ====== Multi-Agent System Initialization ======
// Registers all 4 agents with the communication bus.
// Call once at app startup.

export function initializeAgents(): void {
  agentBus.register(orchestratorAgent)
  agentBus.register(monitorAgent)
  agentBus.register(advisorAgent)
  agentBus.register(executorAgent)
  console.log('[AgentSystem] All 4 agents registered: Orchestrator, Monitor, Advisor, Executor')
}

export { agentBus }
export { orchestratorAgent } from './OrchestratorAgent'
export { monitorAgent } from './MonitorAgent'
export { advisorAgent } from './AdvisorAgent'
export { executorAgent } from './ExecutorAgent'
export * from './types'
