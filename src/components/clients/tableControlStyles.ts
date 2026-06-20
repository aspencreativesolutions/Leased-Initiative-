/** Start-project / Active controls in the client table */
export const tableControlWidthClass = 'w-[4.25rem] min-w-[4.25rem] max-w-[4.25rem]'

export const tableControlBoxClass = [
  'table-row-chip box-border inline-flex shrink-0 items-center justify-center gap-0.5',
  'rounded-sm border-[length:var(--border-width)] px-1',
  'text-[10px] font-black uppercase leading-none tracking-caps whitespace-nowrap',
  tableControlWidthClass,
].join(' ')

/** Active project indicator — gentle live pulse while project is running */
export const tableActiveBoxClass = [
  tableControlBoxClass,
  'active-live-tag origin-center border-[length:var(--border-width)]',
  'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
].join(' ')

/** Tier dropdown — wider + extra right padding for the native chevron */
export const tierSelectWidthClass = 'w-[6.5rem] min-w-[6.5rem] max-w-[6.5rem]'

export const tierSelectClass = [
  'table-row-chip box-border inline-flex shrink-0 items-center',
  'rounded-sm border-[length:var(--border-width)] pl-1.5 pr-6',
  'text-[10px] font-black uppercase leading-none tracking-caps whitespace-nowrap',
  tierSelectWidthClass,
].join(' ')

/** Compact text view control — bottom-right of client rows/cards */
export const tableViewLinkClass = [
  'table-row-chip box-border inline-flex shrink-0 items-center justify-center gap-0.5',
  'rounded-sm border border-ink bg-transparent px-1.5',
  'text-[8px] font-black uppercase leading-none tracking-caps text-ink',
  'transition-colors hover:bg-ink hover:text-surface-paper',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
].join(' ')

/** Subtle view link beneath remove control */
export const tableViewLinkSubtleClass = [
  'inline-flex shrink-0 items-center gap-0.5',
  'text-[7px] font-semibold uppercase leading-none tracking-caps text-ink-faint',
  'transition-colors hover:text-brand',
  'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1',
].join(' ')

/** Compact remove control at row end */
export const tableRemoveButtonClass = [
  'table-remove-button table-row-chip inline-flex shrink-0 items-center justify-center',
  'w-[var(--table-row-chip-height)] min-w-[var(--table-row-chip-height)] max-w-[var(--table-row-chip-height)]',
  'rounded-sm bg-transparent text-ink-muted',
  'transition-colors',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
].join(' ')

/** @deprecated Icon-only view — prefer tableViewLinkClass */
export const tableViewButtonClass = [
  'box-border inline-flex h-7 w-7 shrink-0 items-center justify-center',
  'rounded-sm border-[length:var(--border-width)] border-ink bg-transparent text-ink',
  'transition-colors hover:bg-ink hover:text-surface-paper',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
].join(' ')
