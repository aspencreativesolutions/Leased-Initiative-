import { describe, expect, it } from 'vitest'
import { applyRentPaymentToStore } from './rentPayments.js'

describe('applyRentPaymentToStore for Zelle', () => {
  it('marks rent invoice paid and completes matching deadlines', () => {
    const store = {
      clients: [
        {
          id: 'c1',
          name: 'Alex Tenant',
          rentInvoice: {
            description: 'August rent',
            amount: 1000,
            currency: 'USD',
            paymentProvider: 'zelle',
            zelleMemo: 'LS-C1-RENT-202608',
            zelleMarkedPaidAt: '2026-07-30T12:00:00.000Z',
            dueDates: ['2026-08-01'],
            monthCount: 1,
            createdAt: '2026-07-30T12:00:00.000Z',
          },
          deadlines: [
            {
              id: 'd1',
              type: 'payment',
              date: '2026-08-01',
              label: 'August rent',
              completed: false,
            },
          ],
          notes: [],
        },
      ],
      adminNotifications: [],
    }

    const next = applyRentPaymentToStore(store, 'c1', {
      provider: 'zelle',
      amount: '1000',
      currency: 'USD',
      orderId: 'zelle-confirm-c1',
      captureId: 'zelle-1',
    })

    const client = next.clients[0]
    expect(client.rentInvoice.paidAt).toBeTruthy()
    expect(client.rentInvoice.paymentProvider).toBe('zelle')
    expect(client.deadlines[0].completed).toBe(true)
    expect(client.notes.some((n) => /Zelle/i.test(n.text))).toBe(true)
  })
})
