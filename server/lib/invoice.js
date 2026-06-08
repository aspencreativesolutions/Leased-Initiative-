import { parseMoney } from './parseMoney.js'

export function buildDepositInvoice(contract, client) {
  const amount =
    parseMoney(contract.depositAmount) ??
    parseMoney(contract.remainingBalance) ??
    parseMoney(contract.totalCost)

  if (!amount) return null

  const scopeHint = contract.projectScope?.trim()
    ? contract.projectScope.trim().slice(0, 80)
    : client.projectName

  const description = `${contract.projectTitle} — down payment deposit (${scopeHint})`.slice(
    0,
    127
  )

  return {
    amount,
    description,
    currency: 'USD',
    invoiceType: 'deposit',
  }
}

export function buildFinalInvoice(contract, client) {
  let amount = parseMoney(contract.remainingBalance)
  if (!amount) {
    const total = parseMoney(contract.totalCost)
    const deposit = parseMoney(contract.depositAmount)
    if (total && deposit && total > deposit) {
      amount = Math.round((total - deposit) * 100) / 100
    }
  }
  if (!amount) return null

  const scopeHint = contract.projectScope?.trim()
    ? contract.projectScope.trim().slice(0, 80)
    : client.projectName

  const description = `${contract.projectTitle} — final project balance (${scopeHint})`.slice(
    0,
    127
  )

  return {
    amount,
    description,
    currency: 'USD',
    invoiceType: 'final',
  }
}
