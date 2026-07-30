import { describe, expect, it } from 'vitest'
import { attachPaymentLink, getContractPaymentProvider, isPaymentProviderConfigured } from './paymentLinks.js'

describe('attachPaymentLink for Zelle', () => {
  it('treats zelle as a contract provider', () => {
    expect(getContractPaymentProvider({ paymentProvider: 'zelle' })).toBe('zelle')
  })

  it('is configured when settings have a Zelle handle', () => {
    expect(isPaymentProviderConfigured('zelle', { zelleHandle: 'pay@landlord.com' })).toBe(true)
    expect(isPaymentProviderConfigured('zelle', {})).toBe(false)
  })

  it('attaches portal pay link and memo when configured', async () => {
    const invoice = await attachPaymentLink(
      {
        description: 'August rent',
        amount: 1200,
        currency: 'USD',
        invoiceType: 'rent',
        dueDates: ['2026-08-01'],
        createdAt: new Date().toISOString(),
      },
      {
        contract: { paymentProvider: 'zelle' },
        clientId: 'tenant-42',
        invoiceType: 'rent',
        settings: { zelleHandle: 'pay@landlord.com' },
      }
    )

    expect(invoice.paymentProvider).toBe('zelle')
    expect(invoice.paymentLink).toMatch(/\/portal\/pay\/zelle\/rent$/)
    expect(invoice.zelleMemo).toMatch(/^LS-/)
  })

  it('omits payment link when Zelle handle is missing', async () => {
    const invoice = await attachPaymentLink(
      {
        description: 'Deposit',
        amount: 500,
        currency: 'USD',
        invoiceType: 'deposit',
        createdAt: new Date().toISOString(),
      },
      {
        contract: { paymentProvider: 'zelle' },
        clientId: 'tenant-42',
        invoiceType: 'deposit',
        settings: {},
      }
    )

    expect(invoice.paymentProvider).toBe('zelle')
    expect(invoice.paymentLink).toBeUndefined()
  })
})
