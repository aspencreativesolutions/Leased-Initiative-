/** Bundled Feature Overview PDF — hashed asset URL (not a stable public path). */
import featureGuidePdfUrl from '@/assets/guides/leased-initiative-feature-overview.pdf?url'

export const FEATURE_GUIDE_TITLE = 'Leased Initiative Feature Overview'

export const FEATURE_GUIDE_PDF_ASSET = featureGuidePdfUrl

/** Chrome / Edge PDF viewer chrome: hide toolbar (download, print) when supported. */
export function featureGuideViewerSrc(objectUrl: string): string {
  return `${objectUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
}
