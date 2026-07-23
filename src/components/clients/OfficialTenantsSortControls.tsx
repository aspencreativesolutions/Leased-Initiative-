import { useEffect, useMemo } from 'react'
import { Select } from '@/components/ui/FormField'
import {
  buildOfficialTenantAddressOptions,
  encodeAddressFocus,
  parseAddressFocus,
  type OfficialTenantAddressFocus,
  type OfficialTenantSortMode,
} from '@/lib/officialTenantSort'
import { cn } from '@/lib/utils'
import type { Client, ContractData, ContractRegion, Property } from '@/types'

const sortSelectClass = [
  'shrink-0 w-full sm:w-[11.5rem]',
  '[&_label]:mb-0.5 [&_label_span]:text-[8px] [&_label_span]:leading-tight',
  '[&_select]:w-full [&_select]:py-1.5 [&_select]:pl-2 [&_select]:pr-7 [&_select]:text-[11px]',
  '[&_select]:appearance-none [&_select]:bg-no-repeat [&_select]:bg-[length:0.55rem_0.55rem] [&_select]:bg-[position:right_0.35rem_center]',
  '[&_select]:bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
  '[&_select]:transition-[border-color,box-shadow] [&_select]:duration-200',
].join(' ')

const addressSelectClass = [
  sortSelectClass,
  'sm:w-[16rem]',
].join(' ')

interface OfficialTenantsSortControlsProps {
  clients: Client[]
  getContractForClient: (clientId: string) => ContractData | undefined
  regions: ContractRegion[]
  properties?: Property[]
  sortMode: OfficialTenantSortMode
  addressFocus: OfficialTenantAddressFocus
  onSortModeChange: (mode: OfficialTenantSortMode) => void
  onAddressFocusChange: (focus: OfficialTenantAddressFocus) => void
  className?: string
}

export function OfficialTenantsSortControls({
  clients,
  getContractForClient,
  regions,
  properties = [],
  sortMode,
  addressFocus,
  onSortModeChange,
  onAddressFocusChange,
  className,
}: OfficialTenantsSortControlsProps) {
  const addressOptions = useMemo(
    () => buildOfficialTenantAddressOptions(clients, getContractForClient, regions, properties),
    [clients, getContractForClient, regions, properties]
  )

  const addressValue = encodeAddressFocus(addressFocus)
  const addressOpen = sortMode === 'address'

  useEffect(() => {
    if (sortMode !== 'address' || addressFocus.kind === 'all') return

    const stillValid =
      (addressFocus.kind === 'state' &&
        addressOptions.states.includes(addressFocus.value)) ||
      (addressFocus.kind === 'region' &&
        addressOptions.regions.some((region) => region.id === addressFocus.value)) ||
      (addressFocus.kind === 'property' &&
        addressOptions.properties.includes(addressFocus.value))

    if (!stillValid) onAddressFocusChange({ kind: 'all' })
  }, [addressFocus, addressOptions, onAddressFocusChange, sortMode])

  return (
    <div className={cn('flex min-w-0 flex-wrap items-end gap-2 sm:gap-3', className)}>
      <Select
        label="Sort By"
        value={sortMode}
        onChange={(e) => {
          const next = e.target.value as OfficialTenantSortMode
          onSortModeChange(next)
          if (next === 'officialDate') onAddressFocusChange({ kind: 'all' })
        }}
        className={sortSelectClass}
      >
        <option value="officialDate">Date Became Official</option>
        <option value="address">Address</option>
      </Select>

      <div
        className={cn(
          'grid min-w-0 transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
          addressOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'pointer-events-none grid-rows-[0fr] opacity-0'
        )}
        aria-hidden={!addressOpen}
      >
        <div className="min-w-0 overflow-hidden">
          <Select
            label="Address"
            value={addressValue}
            disabled={!addressOpen}
            onChange={(e) => onAddressFocusChange(parseAddressFocus(e.target.value))}
            className={addressSelectClass}
          >
            <option value="all">All addresses (A–Z)</option>
            {addressOptions.states.length > 0 && (
              <optgroup label="State">
                {addressOptions.states.map((state) => (
                  <option key={`state:${state}`} value={encodeAddressFocus({ kind: 'state', value: state })}>
                    {state}
                  </option>
                ))}
              </optgroup>
            )}
            {addressOptions.regions.length > 0 && (
              <optgroup label="Group">
                {addressOptions.regions.map((region) => (
                  <option
                    key={`region:${region.id}`}
                    value={encodeAddressFocus({ kind: 'region', value: region.id })}
                  >
                    {region.name}
                  </option>
                ))}
              </optgroup>
            )}
            {addressOptions.properties.length > 0 && (
              <optgroup label="Rental">
                {addressOptions.properties.map((property) => (
                  <option
                    key={`property:${property}`}
                    value={encodeAddressFocus({ kind: 'property', value: property })}
                  >
                    {property}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>
      </div>
    </div>
  )
}
