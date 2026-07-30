import {
  getConditionReportPreferences,
  withConditionReportClause,
} from './conditionReport.js'
import { getKeyReturnPreferences, withKeyReturnClause } from './keyReturn.js'
import {
  getTenantPhotoPreferences,
  withTenantPhotoClause,
} from './tenantPhoto.js'

/** Apply current landlord preference clauses to editable lease termination terms. */
export function withLeasePreferenceClauses(existingTerms, settings) {
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
