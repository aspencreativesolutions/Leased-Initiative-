import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import {
  AddRentalButton,
  AddRentalModal,
} from '@/components/properties/AddPropertyModal'
import {
  PropertyTable,
  type PropertySortColumn,
  type PropertyTableRow,
} from '@/components/properties/PropertyTable'
import { RentalDetailModal } from '@/components/properties/RentalDetailModal'
import { UpcomingOpeningsPanel } from '@/components/dashboard/UpcomingOpeningsPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import {
  activeTenantsAtProperty,
  openUnitsForRental,
} from '@/lib/properties'
import { PROPERTY_HOUSING_TYPES, type Property, type PropertyHousingType } from '@/types'
import { cn } from '@/lib/utils'

const filterSelectClass = [
  'shrink-0 w-full sm:w-[11.5rem]',
  '[&_label]:mb-0.5 [&_label_span]:text-[8px] [&_label_span]:leading-tight',
  '[&_select]:w-full [&_select]:py-1.5 [&_select]:pl-2 [&_select]:pr-7 [&_select]:text-[11px]',
  '[&_select]:appearance-none [&_select]:bg-no-repeat [&_select]:bg-[length:0.55rem_0.55rem] [&_select]:bg-[position:right_0.35rem_center]',
  '[&_select]:bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
].join(' ')

function compareRows(
  a: PropertyTableRow,
  b: PropertyTableRow,
  column: PropertySortColumn,
  direction: 'asc' | 'desc'
): number {
  const dir = direction === 'asc' ? 1 : -1
  switch (column) {
    case 'address':
      return (
        a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }) * dir
      )
    case 'propertyType':
      return (
        a.propertyType.localeCompare(b.propertyType, undefined, {
          sensitivity: 'base',
        }) * dir
      )
    case 'bedrooms':
      return (a.bedrooms - b.bedrooms) * dir
    case 'maxTenants':
      return (a.maxTenants - b.maxTenants) * dir
    case 'currentTenants':
      return (a.currentTenants - b.currentTenants) * dir
    case 'openUnits':
      return (a.openUnits - b.openUnits) * dir
  }
}

export function PropertiesPage() {
  const { properties, clients, getContractForClient, settings } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<Property | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PropertyHousingType | ''>('')
  const [sortColumn, setSortColumn] = useState<PropertySortColumn>('address')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const companyName = settings.businessName?.trim() || 'your company'

  const rows = useMemo((): PropertyTableRow[] => {
    return properties.map((property) => {
      const currentTenants = activeTenantsAtProperty(
        property,
        clients,
        getContractForClient
      ).length
      return {
        id: property.id,
        address: property.address,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        maxTenants: property.maxTenants,
        currentTenants,
        openUnits: openUnitsForRental(property, clients, getContractForClient),
      }
    })
  }, [properties, clients, getContractForClient])

  const filteredSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rows.filter((row) => {
      const matchesType = !typeFilter || row.propertyType === typeFilter
      const matchesSearch =
        !q ||
        row.address.toLowerCase().includes(q) ||
        row.propertyType.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
    return [...filtered].sort((a, b) =>
      compareRows(a, b, sortColumn, sortDirection)
    )
  }, [rows, search, typeFilter, sortColumn, sortDirection])

  const handleSortChange = (column: PropertySortColumn) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortColumn(column)
    setSortDirection(column === 'address' || column === 'propertyType' ? 'asc' : 'desc')
  }

  const handleAdded = () => {
    setSuccessMessage('Rental added successfully.')
    window.setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleRowClick = (row: PropertyTableRow) => {
    const property = properties.find((entry) => entry.id === row.id) ?? null
    setSelectedRental(property)
  }

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Rentals"
        subtitle={`Manage the rental portfolio for ${companyName}. Rentals here appear in tenant signup, invitations, leases, and Upcoming Openings.`}
        action={<AddRentalButton onClick={() => setAddOpen(true)} />}
      />

      {successMessage ? (
        <p className="mb-4 text-sm font-medium text-brand" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="space-y-6">
        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No rentals yet"
            description="Add your first rental to start building your portfolio and make it available for tenants and leases."
            action={<AddRentalButton onClick={() => setAddOpen(true)} />}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <label className="relative block min-w-0 flex-1 sm:max-w-sm">
                <span className="sr-only">Search rentals</span>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by address or rental type…"
                  className={cn(
                    'w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line',
                    'bg-surface-paper py-1.5 pl-8 pr-3 text-[11px] text-ink placeholder:text-ink-faint',
                    'focus:border-ink focus:outline-none focus:ring-0'
                  )}
                />
              </label>
              <Select
                label="Rental type"
                name="propertyTypeFilter"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter((e.target.value || '') as PropertyHousingType | '')
                }
                className={filterSelectClass}
              >
                <option value="">All types</option>
                {PROPERTY_HOUSING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <p className="text-sm text-ink-muted">
              Select any rental to view its property details, current tenants, lease information,
              occupancy, and related records.
            </p>

            {filteredSortedRows.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No matching rentals"
                description="Try a different search or clear the rental type filter."
              />
            ) : (
              <PropertyTable
                rows={filteredSortedRows}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onRowClick={handleRowClick}
              />
            )}
          </div>
        )}

        <UpcomingOpeningsPanel />
      </div>

      <AddRentalModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleAdded}
      />

      <RentalDetailModal
        property={selectedRental}
        open={Boolean(selectedRental)}
        onClose={() => setSelectedRental(null)}
      />
    </div>
  )
}

/** Alias matching Rentals terminology. */
export const RentalsPage = PropertiesPage
