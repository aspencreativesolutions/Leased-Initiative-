import { jsPDF } from 'jspdf'
import { migrateServiceTier } from '@/lib/serviceTiers'
import type { BusinessSettings, ContractData } from '@/types'

/** Editorial contract palette — matches the in-app form preview */
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
  settings: BusinessSettings,
  tier: string
): number {
  drawPageBackground(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setText(doc, PDF.ink)
  doc.text('CONTRACT AGREEMENT', PAGE_WIDTH / 2, 28, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  setText(doc, PDF.inkMuted)
  doc.text(
    `Lease for ${contract.businessName} — ${contract.projectTitle}`,
    PAGE_WIDTH / 2,
    38,
    { align: 'center' }
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setText(doc, PDF.inkFaint)
  doc.text(
    `TOTAL ${contract.totalCost || '—'} · DEPOSIT ${contract.depositAmount || '—'} · ${tier.toUpperCase()}`,
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
  const tier = migrateServiceTier(contract.serviceTier)

  let y = addDocumentHeader(doc, contract, settings, tier)

  const clientBlock = [
    contract.clientName,
    contract.businessName,
    contract.email,
    contract.phone,
    contract.clientAddress,
  ]
    .filter(Boolean)
    .join('\n')

  y = addSection(doc, 'Client information', clientBlock, y)
  y = addSection(
    doc,
    'Project scope',
    `Service tier: ${tier}\n\n${contract.projectScope}`,
    y
  )
  y = addSection(doc, 'Services included', contract.servicesIncluded, y)
  y = addSection(doc, 'Services not included', contract.servicesNotIncluded, y)
  y = addSection(doc, 'Deliverables', contract.deliverables, y)
  y = addSection(
    doc,
    'Timeline',
    `Start: ${contract.startDate || '—'}\nCompletion: ${contract.completionDate || '—'}`,
    y
  )
  y = addSection(
    doc,
    'Payment schedule',
    [
      contract.totalCost && `Total: ${contract.totalCost}`,
      contract.depositAmount && `Deposit: ${contract.depositAmount}`,
      contract.remainingBalance && `Remaining: ${contract.remainingBalance}`,
      contract.paymentSchedule,
    ]
      .filter(Boolean)
      .join('\n\n'),
    y
  )
  y = addSection(doc, 'Payment methods', contract.paymentMethods, y)
  y = addSection(doc, 'Late payment policy', contract.latePaymentPolicy, y)
  y = addSection(
    doc,
    'Revisions',
    [
      contract.revisionCount && `Included: ${contract.revisionCount}`,
      contract.extraRevisionFee && `Extra fee: ${contract.extraRevisionFee}`,
      contract.revisionLimits,
    ]
      .filter(Boolean)
      .join('\n\n'),
    y
  )
  y = addSection(doc, 'Client responsibilities', contract.clientResponsibilities, y)
  y = addSection(
    doc,
    'Communication',
    `Method: ${contract.communicationMethod}\nResponse time: ${contract.responseTime}\nMeetings: ${contract.meetingExpectations}`,
    y
  )
  y = addSection(doc, 'Ownership terms', contract.ownershipTerms, y)
  y = addSection(doc, 'Portfolio rights', contract.portfolioRights, y)
  y = addSection(doc, 'Termination conditions', contract.terminationTerms, y)

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
        'Designer signature & date',
        [contract.designerSignature, contract.designerSignDate].filter(Boolean).join('\n'),
        y
      )
    }
    if (contract.clientSignature) {
      y = addSection(
        doc,
        'Client signature & date',
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
      `${settings.businessName || 'Leased'} · Page ${i} of ${pageCount}`,
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
  const name =
    filename ||
    `Lease-${contract.businessName.replace(/\s+/g, '-')}-${contract.projectTitle.replace(/\s+/g, '-')}.pdf`
  doc.save(name)
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

export function contractPdfFilename(contract: ContractData): string {
  return `Lease-${contract.businessName.replace(/\s+/g, '-')}-${contract.projectTitle.replace(/\s+/g, '-')}.pdf`
}
