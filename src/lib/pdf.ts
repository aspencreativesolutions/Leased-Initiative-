import { jsPDF } from 'jspdf'
import type { BusinessSettings, ContractData } from '@/types'

const MARGIN = 20
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 6

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

function addSection(doc: jsPDF, title: string, y: number): number {
  if (y > 260) {
    doc.addPage()
    y = MARGIN
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(44, 74, 110)
  doc.text(title, MARGIN, y)
  doc.setDrawColor(220, 220, 220)
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  return y + 10
}

export function generateContractPdf(
  contract: ContractData,
  settings: BusinessSettings
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  doc.setFillColor(44, 74, 110)
  doc.rect(0, 0, PAGE_WIDTH, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(settings.businessName || 'Client Craft', MARGIN, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Website & Design Services Agreement', MARGIN, 22)

  y = 38
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(contract.projectTitle, MARGIN, y)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Prepared for: ${contract.clientName} · ${contract.businessName}`, MARGIN, y)
  y += 5
  doc.text(`Date: ${new Date(contract.createdAt).toLocaleDateString('en-US')}`, MARGIN, y)
  y += 12

  y = addSection(doc, '1. Client Information', y)
  y = addWrappedText(
    doc,
    `${contract.clientName}\n${contract.businessName}\n${contract.email}\n${contract.phone}${contract.clientAddress ? '\n' + contract.clientAddress : ''}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  y = addSection(doc, '2. Project Scope', y)
  y = addWrappedText(
    doc,
    `Service Tier: ${contract.serviceTier || 'Starter'}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 4
  y = addWrappedText(doc, `Scope:\n${contract.projectScope}`, MARGIN, y, CONTENT_WIDTH)
  y += 4
  y = addWrappedText(doc, `Services Included:\n${contract.servicesIncluded}`, MARGIN, y, CONTENT_WIDTH)
  y += 4
  y = addWrappedText(
    doc,
    `Services Not Included:\n${contract.servicesNotIncluded}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 4
  y = addWrappedText(doc, `Deliverables:\n${contract.deliverables}`, MARGIN, y, CONTENT_WIDTH)
  y += 4
  y = addWrappedText(
    doc,
    `Timeline: ${contract.startDate} to ${contract.completionDate}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  y = addSection(doc, '3. Payment Terms', y)
  y = addWrappedText(
    doc,
    `Total Project Cost: ${contract.totalCost}\nDeposit: ${contract.depositAmount}\nRemaining Balance: ${contract.remainingBalance}\n\nPayment Schedule:\n${contract.paymentSchedule}\n\nAccepted Methods: ${contract.paymentMethods}\n\nLate Payment Policy:\n${contract.latePaymentPolicy}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  y = addSection(doc, '4. Revisions', y)
  y = addWrappedText(
    doc,
    `Included Revisions: ${contract.revisionCount}\nExtra Revision Fee: ${contract.extraRevisionFee}\nRevision Limits:\n${contract.revisionLimits}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  if (y > 220) {
    doc.addPage()
    y = MARGIN
  }
  y = addSection(doc, '5. Client Responsibilities', y)
  y = addWrappedText(doc, contract.clientResponsibilities, MARGIN, y, CONTENT_WIDTH)
  y += 8

  y = addSection(doc, '6. Communication', y)
  y = addWrappedText(
    doc,
    `Preferred Method: ${contract.communicationMethod}\nExpected Response Time: ${contract.responseTime}\nMeetings/Calls: ${contract.meetingExpectations}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  y = addSection(doc, '7. Ownership & Rights', y)
  y = addWrappedText(
    doc,
    `Ownership:\n${contract.ownershipTerms}\n\nPortfolio Rights:\n${contract.portfolioRights}`,
    MARGIN,
    y,
    CONTENT_WIDTH
  )
  y += 8

  if (y > 200) {
    doc.addPage()
    y = MARGIN
  }
  y = addSection(doc, '8. Termination', y)
  y = addWrappedText(doc, contract.terminationTerms, MARGIN, y, CONTENT_WIDTH)
  y += 12

  if (settings.defaultContractFooter) {
    y = addWrappedText(doc, settings.defaultContractFooter, MARGIN, y, CONTENT_WIDTH, 9)
    y += 10
  }

  if (y > 230) {
    doc.addPage()
    y = MARGIN
  }

  y = addSection(doc, '9. Signatures', y)
  y += 8
  const sigY = y + 20
  doc.setDrawColor(180, 180, 180)
  doc.line(MARGIN, sigY, MARGIN + 70, sigY)
  doc.line(PAGE_WIDTH - MARGIN - 70, sigY, PAGE_WIDTH - MARGIN, sigY)
  doc.setFontSize(9)
  doc.text('Client Signature', MARGIN, sigY + 6)
  doc.text('Designer Signature', PAGE_WIDTH - MARGIN - 70, sigY + 6)
  doc.text(`Date: ${contract.clientSignDate || '_______________'}`, MARGIN, sigY + 12)
  doc.text(`Date: ${contract.designerSignDate || '_______________'}`, PAGE_WIDTH - MARGIN - 70, sigY + 12)

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`${settings.businessName} · Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, 290, {
      align: 'center',
    })
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
