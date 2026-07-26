/**
 * Site-wide "live update" flag — when enabled, visitors see a status indicator
 * while the host is deploying changes. Persisted on disk (not demo sandbox).
 */

export function getLiveUpdateState(store) {
  const enabled = Boolean(store?.liveUpdate?.enabled)
  return { enabled }
}

export function setLiveUpdateEnabled(store, enabled) {
  return {
    ...store,
    liveUpdate: {
      ...(store.liveUpdate && typeof store.liveUpdate === 'object' ? store.liveUpdate : {}),
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
    },
  }
}
