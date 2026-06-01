// Shared activity timestamp — replaces AgentBus conflict detection.
// ShoppingAgent calls touch() on each user input.
// MonitorAgent calls isUserActive() before pushing.

let lastUserActivityTime = 0
const ACTIVITY_COOLDOWN_MS = 10000

export const activityClock = {
  touch() {
    lastUserActivityTime = Date.now()
  },

  isUserActive(): boolean {
    return Date.now() - lastUserActivityTime < ACTIVITY_COOLDOWN_MS
  },

  idleTime(): number {
    return Date.now() - lastUserActivityTime
  },
}
