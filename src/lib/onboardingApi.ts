import { apiFetch } from '@/lib/api'
import type { OnboardingProgress } from '@/types'

export async function fetchOnboardingProgress(role: 'admin' | 'client') {
  const path = role === 'admin' ? '/api/data/onboarding' : '/api/portal/onboarding'
  const data = await apiFetch<{ progress: OnboardingProgress }>(path)
  return data.progress
}

export async function updateOnboardingProgress(
  role: 'admin' | 'client',
  payload: { stepId?: string; complete?: boolean; dismiss?: boolean; reset?: boolean }
) {
  const path = role === 'admin' ? '/api/data/onboarding' : '/api/portal/onboarding'
  const data = await apiFetch<{ progress: OnboardingProgress }>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.progress
}
