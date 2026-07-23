/** Emails for demo/sample clients — used to tag legacy data without isSampleClient flag */
export const SAMPLE_CLIENT_EMAILS = new Set([
  'james@chenarch.com',
  'jordan.kim@example.com',
  'emily@rodriguezwellness.com',
  'marcus@webblegal.com',
  'lisa@parkphoto.com',
  'ava.torres@example.com',
  'noah.patel@example.com',
  'priya.shah@example.com',
  'ethan.brooks@example.com',
  'maya.lopez@example.com',
  'chris.nguyen@example.com',
  'sam.rivera@example.com',
])

/** Former sample tenants removed from the product — purged from existing stores on boot. */
export const REMOVED_SAMPLE_CLIENT_EMAILS = new Set([
  'sarah@bloombotanicals.com',
  'sarahmiller@nextgarden.com',
])

/** Display names purged alongside retired mock / demo tenants. */
export const REMOVED_SAMPLE_CLIENT_NAMES = new Set(['sarah miller'])

export function isSampleClientEmail(email: string): boolean {
  return SAMPLE_CLIENT_EMAILS.has(email.toLowerCase())
}
