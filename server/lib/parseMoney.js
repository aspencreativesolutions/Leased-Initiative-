export function parseMoney(value) {
  if (!value?.trim()) return null
  const cleaned = value.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) && num > 0 ? num : null
}
