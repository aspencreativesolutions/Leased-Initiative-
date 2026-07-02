import path from 'path'
import { fileURLToPath } from 'url'
import { test, expect, type Page } from '@playwright/test'
import { E2E_ADMIN } from './global-setup'
import {
  clickDepositInvoice,
  findContractIdForClient,
  getRegistrations,
  loginApi,
  prepareDepositFlow,
  registerClientApi,
  simulateDepositPaid,
  simulateFinalPaid,
  startProjectApi,
  completeProjectApi,
  verifyEmailByAddress,
} from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadFixture = path.join(__dirname, 'fixtures', 'sample-upload.pdf')
const uploadFileName = 'sample-upload.pdf'

/** Shared state across serial tests — one full lifecycle run */
const state = {
  clientName: 'E2E Demo Client',
  clientEmail: `e2e.client.${Date.now()}@example.com`,
  clientPassword: 'E2eClient123!',
  clientToken: '',
  adminToken: '',
  clientId: '',
  contractId: '',
}

let adminPage: Page
let clientPage: Page

test.describe.configure({ mode: 'serial' })

test.describe('Client Craft E2E — full lifecycle', () => {
  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage()
    clientPage = await browser.newPage()
    state.adminToken = await loginApi(E2E_ADMIN.email, E2E_ADMIN.password)
  })

  test.afterAll(async () => {
    await adminPage?.close()
    await clientPage?.close()
  })

  test('01 — client registers for the portal', async () => {
    await registerClientApi(state.clientName, state.clientEmail, state.clientPassword)

    await clientPage.goto('/register')
    await expect(clientPage.getByRole('heading', { name: 'Create an account' })).toBeVisible()

    state.clientToken = await verifyEmailByAddress(state.clientEmail)
    expect(state.clientToken).toBeTruthy()
  })

  test('02 — unlinked client sees the waiting dashboard', async () => {
    await clientPage.goto('/login')
    await clientPage.locator('input[type="email"]').fill(state.clientEmail)
    await clientPage.locator('input[type="password"]').fill(state.clientPassword)
    await clientPage.getByRole('button', { name: 'Sign in' }).click()

    await expect(clientPage).toHaveURL(/\/portal/)
    await expect(clientPage.getByRole('heading', { name: 'Welcome' })).toBeVisible()
    await expect(clientPage.getByText(/waiting to be accepted/i)).toBeVisible()
  })

  test('03 — admin sees registration and accepts the client', async () => {
    const { registrations } = await getRegistrations(state.adminToken)
    const registration = registrations.find((r) => r.email === state.clientEmail)
    expect(registration).toBeTruthy()

    await adminPage.goto('/studio/login')
    await adminPage.locator('input[type="email"]').fill(E2E_ADMIN.email)
    await adminPage.locator('input[type="password"]').fill(E2E_ADMIN.password)
    await adminPage.getByRole('button', { name: 'Sign in' }).click()
    await expect(adminPage).toHaveURL('/studio')

    await adminPage.getByRole('button', { name: /View New Registers|Registers/i }).click()
    await expect(adminPage.getByRole('heading', { name: 'New Registrations' })).toBeVisible()
    const registrationRow = adminPage.locator('li').filter({ hasText: state.clientEmail })
    await registrationRow.getByRole('button', { name: 'Accept User and Start Contract Draft' }).click()

    await expect(adminPage).toHaveURL(/\/studio\/clients\/[^/]+\/contract/)
    const match = adminPage.url().match(/\/studio\/clients\/([^/]+)\/contract/)
    expect(match).toBeTruthy()
    state.clientId = match![1]
    state.contractId = findContractIdForClient(state.clientId)
  })

  test('04 — admin completes contract wizard and sends to client', async () => {
    await adminPage.goto(`/studio/clients/${state.clientId}/contract`)
    await expect(adminPage.getByText('Client Details.')).toBeVisible()

    await adminPage.getByRole('button', { name: 'Next' }).click()
    await adminPage.getByRole('button', { name: 'Next' }).click()
    await adminPage.getByPlaceholder('$5,000').fill('5000')
    await adminPage.getByPlaceholder('$2,500').first().fill('2500')
    await adminPage.getByPlaceholder('$2,500').nth(1).fill('2500')

    for (let i = 0; i < 3; i += 1) {
      await adminPage.getByRole('button', { name: 'Next' }).click()
    }

    await expect(adminPage.getByRole('button', { name: 'Generate Contract PDF' })).toBeVisible()
    const downloadPromise = adminPage.waitForEvent('download')
    await adminPage.getByRole('button', { name: 'Generate Contract PDF' }).click()
    await downloadPromise
    await expect(adminPage.getByText('PDF generated')).toBeVisible()

    await adminPage.getByRole('button', { name: 'Send to Client' }).click()
    await expect(adminPage.getByRole('heading', { name: 'Send Contract to Client' })).toBeVisible()
    await adminPage.getByRole('button', { name: 'Send to client account' }).click()
    await expect(adminPage.getByText(/Contract sent to/i)).toBeVisible({ timeout: 20_000 })

    state.contractId = findContractIdForClient(state.clientId)
  })

  test('05 — client reviews and signs the contract', async () => {
    await clientPage.goto(`/portal/contracts/${state.contractId}`)
    await expect(clientPage.getByRole('heading', { level: 1 })).toBeVisible()

    const reviewButton = clientPage.getByRole('button', { name: 'I have reviewed this contract' })
    if (await reviewButton.isVisible()) {
      await reviewButton.click()
    }

    await clientPage.locator('.contract-sign-paper input[type="text"]').fill(state.clientName)
    await clientPage.getByRole('checkbox').check()
    await clientPage.getByRole('button', { name: 'Accept contract' }).click()

    await expect(clientPage.getByText('Contract accepted')).toBeVisible({ timeout: 20_000 })
    state.clientToken = await loginApi(state.clientEmail, state.clientPassword)
  })

  test('06 — admin sends deposit invoice (via test helper)', async () => {
    await prepareDepositFlow(state.adminToken, state.clientId)

    await adminPage.goto(`/studio/clients/${state.clientId}`)
    await expect(adminPage.getByRole('heading', { name: 'Deposit Invoice' })).toBeVisible()
  })

  test('07 — client opens payment link; deposit is recorded', async () => {
    await clickDepositInvoice(state.clientToken)
    await simulateDepositPaid(state.adminToken, state.clientId)

    await clientPage.goto('/portal')
    await expect(clientPage.getByText('Down payment received', { exact: true })).toBeVisible({
      timeout: 20_000,
    })
  })

  test('08 — admin starts the project', async () => {
    try {
      await startProjectApi(state.adminToken, state.clientId)
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('already been started'))) {
        throw err
      }
    }

    await adminPage.goto('/studio')
    const row = adminPage.getByRole('row').filter({ hasText: state.clientName })
    await expect(row.getByText('Active')).toBeVisible({ timeout: 15_000 })
  })

  test('09 — client uploads a project file', async () => {
    await clientPage.goto('/portal')
    await expect(clientPage.getByText('Project active')).toBeVisible({
      timeout: 20_000,
    })

    const fileInput = clientPage.locator('input[type="file"]')
    await fileInput.setInputFiles(uploadFixture)
    await expect(clientPage.getByText(uploadFileName)).toBeVisible({ timeout: 20_000 })
  })

  test('10 — admin sees client upload on profile', async () => {
    await adminPage.goto(`/studio/clients/${state.clientId}#project-files`)
    await expect(adminPage.getByRole('button', { name: uploadFileName })).toBeVisible({
      timeout: 20_000,
    })
  })

  test('11 — admin marks project complete and final payment is recorded', async () => {
    try {
      await completeProjectApi(state.adminToken, state.clientId)
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('already marked complete'))) {
        throw err
      }
    }

    await simulateFinalPaid(state.adminToken, state.clientId)

    await clientPage.goto('/portal')
    await expect(clientPage.getByText('Final balance received', { exact: true })).toBeVisible({
      timeout: 20_000,
    })
  })
})
