const LEASE_PREVIEW_CLIENT_KEY = 'lease-agreement-preview-client-id'

/** Queue Lease Agreement Preview to open after a draft is generated (e.g. Add Tenant). */
export function requestLeaseAgreementPreview(clientId: string) {
  const id = clientId.trim()
  if (!id) return
  try {
    sessionStorage.setItem(LEASE_PREVIEW_CLIENT_KEY, id)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function peekLeaseAgreementPreviewRequest(): string | null {
  try {
    return sessionStorage.getItem(LEASE_PREVIEW_CLIENT_KEY)?.trim() || null
  } catch {
    return null
  }
}

export function consumeLeaseAgreementPreviewRequest(): string | null {
  const id = peekLeaseAgreementPreviewRequest()
  if (!id) return null
  try {
    sessionStorage.removeItem(LEASE_PREVIEW_CLIENT_KEY)
  } catch {
    /* ignore */
  }
  return id
}
