/** Emails for demo/sample clients — used to tag legacy data without isSampleClient flag */
export const SAMPLE_CLIENT_EMAILS = new Set([
  'sarah@bloombotanicals.com',
  'james@chenarch.com',
  'emily@rodriguezwellness.com',
  'marcus@webblegal.com',
  'lisa@parkphoto.com',
])

export function isSampleClientEmail(email: string): boolean {
  return SAMPLE_CLIENT_EMAILS.has(email.toLowerCase())
}
