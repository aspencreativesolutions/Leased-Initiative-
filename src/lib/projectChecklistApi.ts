import { apiFetch } from '@/lib/api'

export async function togglePortalChecklistItem(itemId: string, completed: boolean) {
  return apiFetch<{ projectChecklistCompleted: string[] }>('/api/portal/checklist', {
    method: 'PATCH',
    body: JSON.stringify({ itemId, completed }),
  })
}
