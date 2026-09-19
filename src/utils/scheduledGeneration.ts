/**
 * Date-math helpers for scheduled-generation tests (recurring expenses, automatic
 * debits, installment purchases). There is no reference-date override on the
 * backend — `GET /gastos/generate` always runs against the real clock — so these
 * tests control the *data* (backdated fecha_compra/fecha_inicio) instead of the
 * clock, then assert against expected dates computed with the same day-clamping
 * rule the backend uses (see calculateRegularInstallmentDate in
 * personal-finance-api-nodeJS/src/strategies/expenseGeneration/installmentStrategy.js).
 *
 * Implemented with plain UTC Date math (not a timezone-aware library) because
 * these are pure calendar-date computations: no instant/timezone conversion is
 * involved, only date-part arithmetic on YYYY-MM-DD strings.
 */

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIsoDate(year: number, monthIndex0: number, day: number) {
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

/** Today's date as YYYY-MM-DD (UTC calendar date). */
export function todayIsoDate() {
  const now = new Date()
  return toIsoDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * A date `monthsBack` months before today, forced to `day`-of-month. Use a
 * `day` that exists in every month (1-28) to avoid clamping ambiguity in the
 * backdated fecha_compra itself.
 */
export function monthsAgoIsoDate(monthsBack: number, day: number) {
  const now = new Date()
  let year = now.getUTCFullYear()
  let month = now.getUTCMonth() - monthsBack

  while (month < 0) {
    month += 12
    year -= 1
  }

  return toIsoDate(year, month, day)
}

/**
 * Mirrors the backend's calculateRegularInstallmentDate: fechaCompra + N months,
 * with the day clamped to the last day of the target month when it doesn't exist
 * (e.g. Jan 31 + 1 month -> Feb 28).
 */
export function regularInstallmentDate(fechaCompraIso: string, cuotaNumero0Based: number) {
  const [year, month, day] = fechaCompraIso.split('-').map(Number)

  let targetYear = year
  let targetMonth = month - 1 + cuotaNumero0Based
  targetYear += Math.floor(targetMonth / 12)
  targetMonth = ((targetMonth % 12) + 12) % 12

  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth))
  return toIsoDate(targetYear, targetMonth, clampedDay)
}
