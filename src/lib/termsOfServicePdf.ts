import { jsPDF } from 'jspdf'
import { BRAND_NAME } from '@/lib/brand'
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_OF_SERVICE_SECTIONS,
} from '@/lib/termsOfService'

const MARGIN = 20
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

/** Build and download a PDF of the current product Terms of Service. */
export function downloadTermsOfServicePdf(): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(17, 17, 17)
  doc.text(`${BRAND_NAME} — Terms of Service`, MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(92, 92, 92)
  doc.text(`Effective date: ${TERMS_EFFECTIVE_DATE}`, MARGIN, y)
  y += 10

  for (const section of TERMS_OF_SERVICE_SECTIONS) {
    y = ensureSpace(doc, y, 24)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(17, 17, 17)
    doc.text(section.title, MARGIN, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)

    for (const paragraph of section.paragraphs) {
      const lines = doc.splitTextToSize(paragraph, CONTENT_WIDTH) as string[]
      for (const line of lines) {
        y = ensureSpace(doc, y, 8)
        doc.text(line, MARGIN, y)
        y += 5
      }
      y += 3
    }
    y += 3
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(138, 133, 128)
    doc.text(
      `${BRAND_NAME} · Terms of Service · Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    )
  }

  doc.save(termsOfServicePdfFilename())
}

export function termsOfServicePdfFilename(): string {
  const date = TERMS_EFFECTIVE_DATE.replace(/\s+/g, '-')
  return `${BRAND_NAME.replace(/\s+/g, '-')}-Terms-of-Service-${date}.pdf`
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y > PAGE_HEIGHT - needed) {
    doc.addPage()
    return MARGIN
  }
  return y
}
