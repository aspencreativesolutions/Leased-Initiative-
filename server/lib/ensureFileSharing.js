import { readStore, updateStore } from '../db.js'
import { buildProjectTimeline } from './projectTimeline.js'
import { applyTimelineSkipEffects } from './timelineSkipEffects.js'
import { TIMELINE_STEP_ORDER } from './timelineSteps.js'
import { generateId } from './notifications.js'

/**
 * Apply missing skip side-effects and set projectStartedAt when the timeline
 * has reached the project-started stage (naturally, skipped, or in progress).
 */
export function repairClientWorkflow(client, contract) {
  if (!client) return { client, contract, changed: false }

  let nextClient = client
  let nextContract = contract ?? null
  let changed = false

  const skippedIds = Object.keys(client.timelineStepSkips ?? {})
  if (skippedIds.length > 0) {
    const timelineSteps = buildProjectTimeline(nextClient, nextContract)
    const activeStep = timelineSteps.find((s) => s.status === 'active')
    const repairTarget = activeStep?.id ?? 'project_started'

    const { client: repaired, contract: repairedContract } = applyTimelineSkipEffects(
      nextClient,
      nextContract,
      skippedIds,
      repairTarget,
      new Date().toISOString()
    )
    if (repaired !== nextClient || repairedContract !== nextContract) {
      nextClient = repaired
      nextContract = repairedContract
      changed = true
    }
  }

  if (nextClient.projectStartedAt) {
    return { client: nextClient, contract: nextContract, changed }
  }

  if (nextClient.projectStatus === 'In Progress') {
    const now = new Date().toISOString()
    nextClient = {
      ...nextClient,
      projectStartedAt: now,
      notes: [
        ...(nextClient.notes ?? []),
        {
          id: generateId(),
          text: `Project started on ${new Date(now).toLocaleDateString()}. Client portal file sharing is now active.`,
          category: 'Project',
          createdAt: now,
        },
      ],
    }
    return { client: nextClient, contract: nextContract, changed: true }
  }

  const steps = buildProjectTimeline(nextClient, nextContract)
  const projectStartedIdx = TIMELINE_STEP_ORDER.indexOf('project_started')
  const projectStartedStep = steps.find((s) => s.id === 'project_started')
  const activeIdx = steps.findIndex((s) => s.status === 'active')

  const priorDone = steps
    .slice(0, projectStartedIdx)
    .every((s) => s.status === 'completed')

  const shouldUnlock =
    priorDone &&
    (projectStartedStep?.status === 'completed' ||
      projectStartedStep?.skipped ||
      activeIdx === projectStartedIdx ||
      activeIdx > projectStartedIdx)

  if (!shouldUnlock) {
    return { client: nextClient, contract: nextContract, changed }
  }

  const now = new Date().toISOString()
  nextClient = {
    ...nextClient,
    projectStatus: 'In Progress',
    projectStartedAt: now,
    notes: [
      ...(nextClient.notes ?? []),
      {
        id: generateId(),
        text: `Project started on ${new Date(now).toLocaleDateString()}. Client portal file sharing is now active.`,
        category: 'Project',
        createdAt: now,
      },
    ],
  }

  return { client: nextClient, contract: nextContract, changed: true }
}

export function ensureClientFileSharing(clientId) {
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const { client: repaired, contract: repairedContract, changed } = repairClientWorkflow(
    client,
    contract
  )

  if (!changed) return store

  return updateStore((s) => ({
    ...s,
    contracts: repairedContract
      ? s.contracts.map((c) => (c.clientId === clientId ? repairedContract : c))
      : s.contracts,
    clients: s.clients.map((c) => (c.id === clientId ? repaired : c)),
  }))
}
