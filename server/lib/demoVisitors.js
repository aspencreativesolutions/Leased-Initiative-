/**
 * Append-only log of first names entered when visitors start the public demo.
 * Persisted on disk (not the demo sandbox) so Admin Mode can review them later.
 */

const MAX_VISITORS = 500
const MAX_FIRST_NAME_LENGTH = 60

export function normalizeDemoVisitorFirstName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_FIRST_NAME_LENGTH)
}

/**
 * Record a demo visitor when they provide a first name.
 * Always call with the on-disk store and write back with writeStoreToDisk
 * so entries survive sandbox reset / demo exit.
 */
export function recordDemoVisitor(store, { firstName, source, companyName } = {}) {
  const name = normalizeDemoVisitorFirstName(firstName)
  if (!name) {
    return { store, recorded: false }
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    firstName: name,
    source: source === 'company-link' ? 'company-link' : 'access-code',
    companyName:
      typeof companyName === 'string' && companyName.trim()
        ? companyName.trim().slice(0, 120)
        : undefined,
    createdAt: new Date().toISOString(),
  }

  const previous = Array.isArray(store.demoVisitors) ? store.demoVisitors : []
  const next = [...previous, entry]
  const trimmed =
    next.length > MAX_VISITORS ? next.slice(next.length - MAX_VISITORS) : next

  return {
    store: {
      ...store,
      demoVisitors: trimmed,
    },
    recorded: true,
    entry,
  }
}

/** Newest first. */
export function listDemoVisitors(store) {
  const visitors = Array.isArray(store.demoVisitors) ? store.demoVisitors : []
  return visitors
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
