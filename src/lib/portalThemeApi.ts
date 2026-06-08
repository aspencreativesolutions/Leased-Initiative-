import { apiFetch } from '@/lib/api'
import type { ThemeId } from '@/themes/types'
import type { User } from '@/types'

export function savePortalTheme(themeId: ThemeId): Promise<User> {
  return apiFetch<{ user: User }>('/api/auth/portal-theme', {
    method: 'PATCH',
    body: JSON.stringify({ themeId }),
  }).then(({ user }) => user)
}
