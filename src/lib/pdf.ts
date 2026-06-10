import { jsPDF } from 'jspdf'
import type { BusinessSettings, ContractData } from '@/types'

/** Ocean Office palette — fixed for print/PDF consistency */
const OCEAN = {
  brand: [15, 41, 66] as [number, number, number],
  brandLight: [30, 58, 95] as [number, number, number],
  accent: [37, 99, 235] as [number, number, number],
  sky: [56, 189, 248] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  inkMuted: [71, 85, 105] as [number, number, number],
  inkFaint: [148, 163, 184] as [number, number, number],
  surface: [241, 245, 249] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
  line: [203, 213, 225] as [number, number, number],
  accentLight: [219, 234, 254] as [number, number, number],
}

const MARGIN = 18
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5.5
const HEADER_HEIGHT = 34

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}

function setStroke(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}

function setText(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function drawHeaderWave(doc: jsPDF) {
  setFill(doc, OCEAN.brand)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')

  // Soft wave transition into page background
  setFill(doc, OCEAN.surface)
  const baseY = HEADER_HEIGHT - 2
  const step = 3
  for (let x = 0; x < PAGE_WIDTH; x += step) {
    const waveY = baseY + Math.sin(x / 18) * 2.5 + 2
    doc.rect(x, waveY, step, PAGE_HEIGHT - waveY, 'F')
  }

  // Sky accent line
  setFill(doc, OCEAN.sky)
  doc.rect(0, HEADER_HEIGHT + 1, PAGE_WIDTH, 0.6, 'F')
  setFill(doc, OCEAN.accent)
  doc.rect(0, HEADER_HEIGHT + 1.8, PAGE_WIDTH, 0.25, 'F')
}

function drawPageBackground(doc: jsPDF) {
  setFill(doc, OCEAN.surface)
  doc.rect(0, HEADER_HEIGHT + 2, PAGE_WIDTH, PAGE_HEIGHT, 'F')
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 10
): number {
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text || '—', maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * (LINE_HEIGHT * (fontSize / 10))
}

function ensureSpace(doc: jsPDF, y: number, needed = 40): number {
  if (y > PAGE_HEIGHT - needed) {
    doc.addPage()
    drawPageBackground(doc)
    return MARGIN + 4
  }
  return y
}

function addSectionGroupLabel(doc: jsPDF, label: string, y: number): number {
  y = ensureSpace(doc, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setText(doc, OCEAN.inkFaint)
  doc.text(label.toUpperCase(), MARGIN, y)

  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.2)
  const labelWidth = doc.getTextWidth(label.toUpperCase())
  doc.line(MARGIN + labelWidth + 4, y - 1, PAGE_WIDTH - MARGIN, y - 1)

  return y + 7
}

function addSection(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  setText(doc, OCEAN.brand)
  doc.text(title, MARGIN + 4, y)

  // Accent underline
  setStroke(doc, OCEAN.sky)
  doc.setLineWidth(0.6)
  doc.line(MARGIN + 4, y + 1.5, MARGIN + 36, y + 1.5)

  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.15)
  doc.line(MARGIN + 4, y + 2.5, PAGE_WIDTH - MARGIN - 4, y + 2.5)

  doc.setFont('helvetica', 'normal')
  setText(doc, OCEAN.inkMuted)
  return y + 9
}

function addSectionBody(
  doc: jsPDF,
  text: string,
  y: number,
  inset = 4
): number {
  y = ensureSpace(doc, y)

  // Soft card background
  setFill(doc, OCEAN.paper)
  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.2)
  const previewLines = doc.splitTextToSize(text || '—', CONTENT_WIDTH - inset * 2 - 8)
  const boxHeight = previewLines.length * LINE_HEIGHT + 14
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, boxHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setText(doc, OCEAN.inkMuted)
  const bodyY = addWrappedText(
    doc,
    text,
    MARGIN + inset + 4,
    y + 4,
    CONTENT_WIDTH - inset * 2 - 8
  )

  return bodyY + 6
}

export function generateContractPdf(
  contract: ContractData,
  settings: BusinessSettings
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  drawHeaderWave(doc)
  drawPageBackground(doc)

  // Header text
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('WEBSITE & DESIGN SERVICES AGREEMENT', MARGIN, 12)

  doc.setFontSize(16)
  doc.text(settings.businessName || 'Client Craft', MARGIN, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 220, 240)
  doc.text(contract.projectTitle, MARGIN, 27)

  let y = HEADER_HEIGHT + 10

  // Summary strip
  setFill(doc, OCEAN.accentLight)
  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 2, 2, 'FD')

  const colW = CONTENT_WIDTH / 3
  const metrics = [
    { label: 'TOTAL', value: contract.totalCost || '—' },
    { label: 'DEPOSIT', value: contract.depositAmount || '—' },
    { label: 'TIER', value: contract.serviceTier || 'Starter' },
  ]

  metrics.forEach((m, i) => {
    const x = MARGIN + colW * i + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    setText(doc, OCEAN.inkFaint)
    doc.text(m.label, x, y + 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setText(doc, OCEAN.brand)
    doc.text(m.value, x, y + 15)
  })

  y += 30
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, OCEAN.inkMuted)
  doc.text(
    `Prepared for ${contract.clientName} · ${contract.businessName}`,
    MARGIN,
    y
  )
  y += 5
  doc.text(`Date: ${new Date(contract.createdAt).toLocaleDateString('en-US')}`, MARGIN, y)
  y += 12

  y = addSectionGroupLabel(doc, 'Project & deliverables', y)

  y = addSection(doc, 'Client information', y)
  y = addSectionBody(
    doc,
    `${contract.clientName}\n${contract.businessName}\n${contract.email}\n${contract.phone}${contract.clientAddress ? '\n' + contract.clientAddress : ''}`,
    y
  )

  y = addSection(doc, 'Project scope', y)
  y = addSectionBody(
    doc,
    `Service tier: ${contract.serviceTier || 'Starter'}\n\n${contract.projectScope}`,
    y
  )

  y = addSection(doc, 'Services included', y)
  y = addSectionBody(doc, contract.servicesIncluded, y)

  y = addSection(doc, 'Services not included', y)
  y = addSectionBody(doc, contract.servicesNotIncluded, y)

  y = addSection(doc, 'Deliverables', y)
  y = addSectionBody(doc, contract.deliverables, y)

  y = addSection(doc, 'Timeline', y)
  y = addSectionBody(
    doc,
    `Start: ${contract.startDate || '—'}\nCompletion: ${contract.completionDate || '—'}`,
    y
  )

  y = addSectionGroupLabel(doc, 'Payment terms', y)

  y = addSection(doc, 'Payment schedule', y)
  y = addSectionBody(
    doc,
    `Total: ${contract.totalCost || '—'}\nDeposit: ${contract.depositAmount || '—'}\nRemaining: ${contract.remainingBalance || '—'}\n\n${contract.paymentSchedule}`,
    y
  )

  y = addSection(doc, 'Payment methods', y)
  y = addSectionBody(doc, contract.paymentMethods, y)

  y = addSection(doc, 'Late payment policy', y)
  y = addSectionBody(doc, contract.latePaymentPolicy, y)

  y = addSectionGroupLabel(doc, 'Revisions & communication', y)

  y = addSection(doc, 'Revisions', y)
  y = addSectionBody(
    doc,
    `Included: ${contract.revisionCount || '—'}\nExtra fee: ${contract.extraRevisionFee || '—'}\n\n${contract.revisionLimits}`,
    y
  )

  y = addSection(doc, 'Client responsibilities', y)
  y = addSectionBody(doc, contract.clientResponsibilities, y)

  y = addSection(doc, 'Communication', y)
  y = addSectionBody(
    doc,
    `Method: ${contract.communicationMethod}\nResponse time: ${contract.responseTime}\nMeetings: ${contract.meetingExpectations}`,
    y
  )

  y = addSectionGroupLabel(doc, 'Rights & termination', y)

  y = addSection(doc, 'Ownership', y)
  y = addSectionBody(doc, contract.ownershipTerms, y)

  y = addSection(doc, 'Portfolio rights', y)
  y = addSectionBody(doc, contract.portfolioRights, y)

  y = addSection(doc, 'Termination', y)
  y = addSectionBody(doc, contract.terminationTerms, y)

  if (settings.defaultContractFooter) {
    y = ensureSpace(doc, y)
    doc.setFontSize(8)
    setText(doc, OCEAN.inkFaint)
    y = addWrappedText(doc, settings.defaultContractFooter, MARGIN, y, CONTENT_WIDTH, 8)
    y += 8
  }

  y = addSectionGroupLabel(doc, 'Signatures', y)
  y = ensureSpace(doc, y, 50)

  const sigY = y + 18
  const sigW = (CONTENT_WIDTH - 8) / 2

  setFill(doc, OCEAN.paper)
  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, y, sigW, 32, 2, 2, 'FD')
  doc.roundedRect(MARGIN + sigW + 8, y, sigW, 32, 2, 2, 'FD')

  setStroke(doc, OCEAN.line)
  doc.setLineWidth(0.3)
  doc.line(MARGIN + 6, sigY, MARGIN + sigW - 6, sigY)
  doc.line(MARGIN + sigW + 14, sigY, PAGE_WIDTH - MARGIN - 6, sigY)

  doc.setFontSize(8)
  setText(doc, OCEAN.inkFaint)
  doc.text('Client signature', MARGIN + 6, sigY + 6)
  doc.text('Designer signature', MARGIN + sigW + 14, sigY + 6)
  doc.text(`Date: ${contract.clientSignDate || '_______________'}`, MARGIN + 6, sigY + 12)
  doc.text(
    `Date: ${contract.designerSignDate || '_______________'}`,
    MARGIN + sigW + 14,
    sigY + 12
  )

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    if (i > 1) {
      drawPageBackground(doc)
    }

    setFill(doc, OCEAN.brand)
    doc.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 10, 'F')
    setFill(doc, OCEAN.sky)
    doc.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 0.4, 'F')

    doc.setFontSize(7.5)
    doc.setTextColor(220, 230, 240)
    doc.text(
      `${settings.businessName} · Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 5,
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
    `Contract-${contract.businessName.replace(/\s+/g, '-')}-${contract.projectTitle.replace(/\s+/g, '-')}.pdf`
  doc.save(name)
}
