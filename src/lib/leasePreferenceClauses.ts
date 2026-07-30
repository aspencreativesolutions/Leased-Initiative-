import {
  getConditionReportPreferences,
  withConditionReportClause,
} from '@/lib/conditionReport'
import {
  getKeyReturnPreferences,
  withKeyReturnClause,
} from '@/lib/keyReturn'
import {
  getTenantPhotoPreferences,
  withTenantPhotoClause,
} from '@/lib/tenantPhoto'
import type {
  ConditionReportPreferences,
  KeyReturnPreferences,
  TenantPhotoPreferences,
} from '@/types'

type PreferenceSettings = {
  keyReturn?: Partial<KeyReturnPreferences> | null
  tenantPhoto?: Partial<TenantPhotoPreferences> | null
  conditionReport?: Partial<ConditionReportPreferences> | null
} | null

/** Apply current landlord preference clauses to editable lease termination terms. */
export function withLeasePreferenceClauses(
  existingTerms: string | undefined,
  settings?: PreferenceSettings
): string {
  const withKeyReturn = withKeyReturnClause(
    existingTerms,
    getKeyReturnPreferences(settings)
  )
  const withPhoto = withTenantPhotoClause(
    withKeyReturn,
    getTenantPhotoPreferences(settings)
  )
  return withConditionReportClause(
    withPhoto,
    getConditionReportPreferences(settings)
  )
}
