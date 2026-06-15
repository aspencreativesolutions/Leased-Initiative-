type BadgeType = 'project' | 'contract' | 'payment'

/** CSS classes for equal-width status badges in table columns */
export function statusBadgeTableClass(type: BadgeType): string {
  return `status-badge--table status-badge--table-${type}`
}
