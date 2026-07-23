/**
 * Resolve “as of” date for rent schedules.
 * Public demo sandbox always uses the shared Demo Mode July clock.
 */
import { getDemoAsOfDate } from './demoClock.js'
import { isDemoSandboxActive } from './demoSandbox.js'

export function resolveServerScheduleAsOf(asOf) {
  if (asOf) return asOf
  if (isDemoSandboxActive()) return getDemoAsOfDate()
  return new Date()
}
