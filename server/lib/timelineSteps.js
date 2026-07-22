export const TIMELINE_STEP_ORDER = [
  'contract_sent',
  'contract_signed',
  'invoice_sent',
  'pay_link_clicked',
  'payment_confirmed',
  'project_started',
  'file_activity',
  'project_completed',
]

export const TIMELINE_STEP_LABELS = {
  contract_sent: 'Lease Sent',
  contract_signed: 'Lease Signed',
  invoice_sent: 'PayPal Invoice Link Sent',
  pay_link_clicked: 'PayPal Link Clicked',
  payment_confirmed: 'Payment Confirmed',
  project_started: 'Start Project Clicked',
  file_activity: 'File Uploads / Notes Added',
  project_completed: 'Project Completed',
}

export function getTimelineStepLabel(stepId) {
  return TIMELINE_STEP_LABELS[stepId] ?? stepId
}
