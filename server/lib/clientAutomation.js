import { readStore, updateStore } from '../db.js'
import {
  pushClientNotification,
  getClientUserForClient,
} from './clientNotifications.js'
import { isEmailConfigured, sendClientReminderEmail } from './email.js'
import { getContractPaymentProvider } from './paymentLinks.js'
import { listUnpaidRentMonths } from './rentPayments.js'
import {
  buildKeyReturnNotificationMessage,
  getKeyReturnPreferences,
  isLeaseCompleteForKeyReturn,
} from './keyReturn.js'
import {
  conditionReportKindLabel,
  ensureConditionReportsForClient,
  isConditionReportRequired,
} from './conditionReport.js'

export const DEFAULT_AUTOMATION = {
  enabled: true,
  deadlineReminderDays: 3,
  sendEmailReminders: true,
  projectStatusUpdates: true,
  followUpReminders: true,
}

export function getAutomationSettings(settings) {
  return { ...DEFAULT_AUTOMATION, ...(settings?.automation ?? {}) }
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function hasRecentReminder(notifications, userId, type, relatedId, withinHours = 20) {
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000
  return (notifications ?? []).some(
    (n) =>
      n.userId === userId &&
      n.type === type &&
      n.relatedId === relatedId &&
      new Date(n.createdAt).getTime() > cutoff
  )
}

export function notifyProjectStatusChange(store, client, statusMessage) {
  const automation = getAutomationSettings(store.settings)
  if (!automation.projectStatusUpdates) return store
  const user = getClientUserForClient(store, client)
  if (!user) return store
  return pushClientNotification(store, {
    userId: user.id,
    clientId: client.id,
    type: 'status_update',
    title: 'Project update',
    message: statusMessage,
    actionUrl: '/portal/timeline',
    relatedId: `status-${client.id}-${client.projectStatus}`,
  })
}

export function runClientAutomation() {
  const store = readStore()
  const automation = getAutomationSettings(store.settings)
  const keyReturnPrefs = getKeyReturnPreferences(store.settings)

  let next = store
  let notificationsCreated = 0
  const emailQueue = []

  // Key return auto-notify is controlled by Preferences, not Client Automation.
  if (keyReturnPrefs.autoNotify) {
    for (const client of store.clients) {
      const user = getClientUserForClient(next, client)
      if (!user) continue
      const contract = next.contracts?.find((c) => c.clientId === client.id)
      if (!isLeaseCompleteForKeyReturn(client, contract)) continue
      const relatedId = `key-return-${client.id}`
      if (
        hasRecentReminder(next.clientNotifications, user.id, 'key_return', relatedId, 24 * 7)
      ) {
        continue
      }
      const message = buildKeyReturnNotificationMessage(keyReturnPrefs)
      next = pushClientNotification(next, {
        userId: user.id,
        clientId: client.id,
        type: 'key_return',
        title: 'Return your keys',
        message,
        actionUrl: '/portal',
        relatedId,
      })
      notificationsCreated++
      emailQueue.push({
        user,
        title: 'Return your keys',
        message,
        portalUrlPath: '/portal',
      })
    }
  }

  if (!automation.enabled) {
    if (notificationsCreated > 0) {
      updateStore(() => next)
    }
    return { ran: true, skipped: true, notificationsCreated }
  }

  for (const client of store.clients) {
    const user = getClientUserForClient(next, client)
    if (!user) continue

    if (automation.followUpReminders && client.followUpDate) {
      const days = daysUntil(client.followUpDate)
      const relatedId = `followup-${client.id}`
      if (days >= 0 && days <= automation.deadlineReminderDays) {
        if (
          !hasRecentReminder(next.clientNotifications, user.id, 'follow_up', relatedId)
        ) {
          const message =
            days === 0
              ? `A follow-up is scheduled for today regarding ${client.projectName}.`
              : `A follow-up is coming up in ${days} day${days === 1 ? '' : 's'} for ${client.projectName}.`
          next = pushClientNotification(next, {
            userId: user.id,
            clientId: client.id,
            type: 'follow_up',
            title: 'Upcoming follow-up',
            message,
            actionUrl: '/portal/timeline',
            relatedId,
          })
          notificationsCreated++
          emailQueue.push({ user, title: 'Upcoming follow-up', message })
        }
      }
    }

    for (const deadline of client.deadlines ?? []) {
      if (deadline.completed) continue
      const days = daysUntil(deadline.date)
      if (days < 0 || days > automation.deadlineReminderDays) continue

      const relatedId = `deadline-${deadline.id}`
      if (
        hasRecentReminder(
          next.clientNotifications,
          user.id,
          'deadline_reminder',
          relatedId
        )
      ) {
        continue
      }

      const label = deadline.label || deadline.type
      const message =
        days === 0
          ? `${label} is scheduled for today${deadline.time ? ` at ${deadline.time}` : ''}.`
          : `${label} is coming up in ${days} day${days === 1 ? '' : 's'} (${deadline.date}).`

      next = pushClientNotification(next, {
        userId: user.id,
        clientId: client.id,
        type: 'deadline_reminder',
        title: 'Upcoming deadline',
        message,
        actionUrl: '/portal/timeline',
        relatedId,
      })
      notificationsCreated++
      emailQueue.push({ user, title: 'Upcoming deadline', message })
    }

    if (client.invoice?.sentToPortalAt && !client.invoice.paidAt) {
      const sentDate = new Date(client.invoice.sentToPortalAt)
      const daysSince = Math.floor(
        (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const relatedId = `payment-reminder-${client.id}`
      if (
        daysSince >= 7 &&
        !hasRecentReminder(
          next.clientNotifications,
          user.id,
          'status_update',
          relatedId,
          168
        )
      ) {
        next = pushClientNotification(next, {
          userId: user.id,
          clientId: client.id,
          type: 'status_update',
          title: 'Deposit payment reminder',
          message: `Your deposit invoice for ${client.projectName} is still outstanding. Pay from your dashboard when ready.`,
          actionUrl: '/portal',
          relatedId,
        })
        notificationsCreated++
      }
    }

    const contract = next.contracts?.find((c) => c.clientId === client.id)
    if (
      client.isOfficialClient &&
      contract &&
      getContractPaymentProvider(contract) === 'zelle'
    ) {
      const unpaid = listUnpaidRentMonths(client, contract)
      const nextDue = unpaid[0]?.dueDate
      if (nextDue) {
        const days = daysUntil(nextDue)
        if (days >= 0 && days <= automation.deadlineReminderDays) {
          const relatedId = `zelle-rent-${client.id}-${nextDue}`
          if (
            !hasRecentReminder(
              next.clientNotifications,
              user.id,
              'deadline_reminder',
              relatedId
            )
          ) {
            const cadence = contract.zelleCadence === 'automatic' ? 'automatic' : 'manual'
            const message =
              days === 0
                ? cadence === 'automatic'
                  ? `Rent is due today via Zelle. If you scheduled a recurring transfer in your bank app, confirm it sent — then mark paid in your portal.`
                  : `Rent is due today via Zelle. Open your pay page to send the transfer and mark it as paid.`
                : cadence === 'automatic'
                  ? `Zelle rent is due in ${days} day${days === 1 ? '' : 's'} (${nextDue}). Confirm your bank-app recurring transfer is set.`
                  : `Zelle rent is due in ${days} day${days === 1 ? '' : 's'} (${nextDue}). Pay from your portal when ready.`
            next = pushClientNotification(next, {
              userId: user.id,
              clientId: client.id,
              type: 'deadline_reminder',
              title: 'Zelle rent reminder',
              message,
              actionUrl: '/portal',
              relatedId,
            })
            notificationsCreated++
            emailQueue.push({
              user,
              title: 'Zelle rent reminder',
              message,
              portalUrlPath: '/portal',
            })
          }
        }
      }
    }

    // Condition report due reminders (required reports only)
    {
      const property = client.propertyId
        ? (next.properties ?? []).find((p) => p.id === client.propertyId)
        : null
      if (isConditionReportRequired(next.settings, property) && client.isOfficialClient) {
        const contract = next.contracts?.find((c) => c.clientId === client.id)
        const ensured = ensureConditionReportsForClient(next, client, contract)
        next = ensured.store
        for (const report of ensured.reports) {
          if (
            report.status !== 'pending' &&
            report.status !== 'changes_requested'
          ) {
            continue
          }
          if (!report.dueDate) continue
          const days = daysUntil(report.dueDate)
          if (days < 0 || days > automation.deadlineReminderDays) continue
          const relatedId = `condition-report-${report.id}-${report.dueDate}`
          if (
            hasRecentReminder(
              next.clientNotifications,
              user.id,
              'condition_report',
              relatedId
            )
          ) {
            continue
          }
          const kindLabel = conditionReportKindLabel(report.kind)
          const message =
            report.status === 'changes_requested'
              ? `Your landlord requested updates on your ${kindLabel.toLowerCase()} condition report. Resubmit by ${report.dueDate}.`
              : days === 0
                ? `Your ${kindLabel.toLowerCase()} condition report is due today. Complete the checklist in your portal.`
                : `Your ${kindLabel.toLowerCase()} condition report is due in ${days} day${days === 1 ? '' : 's'} (${report.dueDate}).`
          next = pushClientNotification(next, {
            userId: user.id,
            clientId: client.id,
            type: 'condition_report',
            title: `${kindLabel} condition report`,
            message,
            actionUrl: `/portal/inspection?id=${encodeURIComponent(report.id)}`,
            relatedId,
          })
          notificationsCreated++
          emailQueue.push({
            user,
            title: `${kindLabel} condition report`,
            message,
            portalUrlPath: '/portal/inspection',
          })
        }
      }
    }
  }

  if (notificationsCreated > 0) {
    updateStore(() => next)
  }

  if (automation.sendEmailReminders && isEmailConfigured() && emailQueue.length > 0) {
    const appUrl = process.env.APP_URL || 'http://localhost:5173'
    for (const item of emailQueue.slice(0, 10)) {
      sendClientReminderEmail({
        to: item.user.email,
        name: item.user.name,
        title: item.title,
        message: item.message,
        portalUrl: `${appUrl}${item.portalUrlPath || '/portal'}`,
      }).catch((err) => console.error('client reminder email', err.message))
    }
  }

  return { ran: true, notificationsCreated }
}

export function startAutomationScheduler(intervalMs = 15 * 60 * 1000) {
  runClientAutomation()
  setInterval(runClientAutomation, intervalMs)
}
