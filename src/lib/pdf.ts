import { jsPDF } from 'jspdf'
import type { BusinessSettings, ContractData } from '@/types'

/** Editorial lease palette — matches the in-app form preview */
const PDF = {
  ink: [17, 17, 17] as [number, number, number],
  inkMuted: [92, 92, 92] as [number, number, number],
  inkFaint: [138, 133, 128] as [number, number, number],
  line: [201, 194, 184] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
}

const MARGIN = 20
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BODY_LINE = 5.2

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}

function setStroke(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}

function setText(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function drawPageBackground(doc: jsPDF) {
  setFill(doc, PDF.paper)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
}

function displayValue(value?: string): string {
  if (!value?.trim()) return '—'
  if (value.includes('[To be customized]')) return '—'
  return value
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 10,
  lineHeight = BODY_LINE
): number {
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text || '—', maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function ensureSpace(doc: jsPDF, y: number, needed = 36): number {
  if (y > PAGE_HEIGHT - needed) {
    doc.addPage()
    drawPageBackground(doc)
    return MARGIN + 6
  }
  return y
}

function addSection(doc: jsPDF, label: string, body: string, y: number): number {
  y = ensureSpace(doc, y, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setText(doc, PDF.ink)
  doc.text(label.toUpperCase(), MARGIN, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setText(doc, PDF.ink)
  y = addWrappedText(doc, body, MARGIN, y, CONTENT_WIDTH, 10, BODY_LINE)

  setStroke(doc, PDF.line)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)

  return y + 10
}

function addDocumentHeader(
  doc: jsPDF,
  contract: ContractData,
  settings: BusinessSettings
): number {
  drawPageBackground(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setText(doc, PDF.ink)
  doc.text('RESIDENTIAL LEASE AGREEMENT', PAGE_WIDTH / 2, 28, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  setText(doc, PDF.inkMuted)
  doc.text(
    `Lease for ${contract.clientName} — ${contract.projectTitle}`,
    PAGE_WIDTH / 2,
    38,
    { align: 'center' }
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setText(doc, PDF.inkFaint)
  doc.text(
    `MONTHLY RENT ${displayValue(contract.totalCost)} · SECURITY DEPOSIT ${displayValue(contract.depositAmount)}`,
    PAGE_WIDTH / 2,
    46,
    { align: 'center' }
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, PDF.inkMuted)
  doc.text(
    `Prepared by ${settings.businessName || settings.ownerName || 'Your landlord'} · Issued ${new Date(contract.createdAt).toLocaleDateString('en-US')}`,
    PAGE_WIDTH / 2,
    53,
    { align: 'center' }
  )

  setStroke(doc, PDF.line)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, 58, PAGE_WIDTH - MARGIN, 58)

  return 66
}

export function generateContractPdf(
  contract: ContractData,
  settings: BusinessSettings
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = addDocumentHeader(doc, contract, settings)

  const tenantBlock = [
    contract.clientName,
    displayValue(contract.businessName) !== '—'
      ? `Mailing: ${contract.businessName}`
      : '',
    contract.email,
    contract.phone,
  ]
    .filter(Boolean)
    .join('\n')

  y = addSection(doc, '1. Landlord information', displayValue(contract.portfolioRights), y)
  y = addSection(doc, '2. Tenant information', tenantBlock, y)
  y = addSection(
    doc,
    '3–4. Rental property & unit',
    [
      `Property address: ${displayValue(contract.clientAddress)}`,
      displayValue(contract.projectScope),
    ].join('\n\n'),
    y
  )
  y = addSection(
    doc,
    '5–6. Lease term',
    `Start: ${displayValue(contract.startDate)}\nEnd: ${displayValue(contract.completionDate)}`,
    y
  )
  y = addSection(
    doc,
    '7–10. Rent, deposit & payment schedule',
    [
      `Monthly rent: ${displayValue(contract.totalCost)}`,
      `Security deposit: ${displayValue(contract.depositAmount)}`,
      `Move-in / first payment: ${displayValue(contract.remainingBalance)}`,
      displayValue(contract.paymentSchedule),
    ].join('\n\n'),
    y
  )
  y = addSection(doc, 'Payment methods', contract.paymentMethods, y)
  y = addSection(doc, '11. Late-payment terms', contract.latePaymentPolicy, y)
  y = addSection(
    doc,
    '12. Occupancy limits',
    [
      `Maximum occupants: ${displayValue(contract.revisionCount)}`,
      displayValue(contract.deliverables),
    ].join('\n\n'),
    y
  )
  y = addSection(
    doc,
    '13. Utilities and services',
    [
      `Included: ${displayValue(contract.servicesIncluded)}`,
      `Tenant pays: ${displayValue(contract.servicesNotIncluded)}`,
    ].join('\n\n'),
    y
  )
  y = addSection(doc, '14. Maintenance responsibilities', contract.clientResponsibilities, y)
  y = addSection(doc, '15. Property-use rules', contract.ownershipTerms, y)
  y = addSection(
    doc,
    '16. Pets',
    [
      displayValue(contract.revisionLimits),
      `Pet deposit / fee: ${displayValue(contract.extraRevisionFee)}`,
    ].join('\n\n'),
    y
  )
  y = addSection(doc, '17. Entry and inspection', contract.meetingExpectations, y)
  y = addSection(doc, '18. Renewal or termination', contract.terminationTerms, y)
  y = addSection(
    doc,
    '19. Notices',
    `Method: ${contract.communicationMethod || '—'}\nNotice period: ${displayValue(contract.responseTime)}`,
    y
  )

  if (settings.defaultContractFooter) {
    y = ensureSpace(doc, y)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    setText(doc, PDF.inkFaint)
    y = addWrappedText(doc, settings.defaultContractFooter, MARGIN, y, CONTENT_WIDTH, 8, 4.5)
    y += 6
  }

  if (contract.designerSignature || contract.clientSignature) {
    y = ensureSpace(doc, y, 40)
    setStroke(doc, PDF.line)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 10

    if (contract.designerSignature) {
      y = addSection(
        doc,
        '20. Landlord signature & date',
        [contract.designerSignature, contract.designerSignDate].filter(Boolean).join('\n'),
        y
      )
    }
    if (contract.clientSignature) {
      y = addSection(
        doc,
        '21–22. Tenant signature & date',
        [contract.clientSignature, contract.clientSignDate].filter(Boolean).join('\n'),
        y
      )
    }
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    if (i > 1) {
      drawPageBackground(doc)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setText(doc, PDF.inkFaint)
    doc.text(
      `${settings.businessName || 'Leased Solutions'} · Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: 'center' }
    )
  }

  return doc
}

export function downloadContractPdf(
  contract: ContractData,
  settings: BusinessSettings,
  filename?: string
): void {
  const doc = generateContractPdf(contract, settings)
  const name = filename || contractPdfFilename(contract)
  doc.save(name)
}

export function contractPdfFilename(contract: ContractData): string {
  const tenant = (contract.clientName || 'Tenant').replace(/\s+/g, '-')
  const title = (contract.projectTitle || 'Lease').replace(/\s+/g, '-')
  return `Lease-${tenant}-${title}.pdf`
}

export function openContractPdfInNewTab(
  contract: ContractData,
  settings: BusinessSettings
): void {
  const doc = generateContractPdf(contract, settings)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
