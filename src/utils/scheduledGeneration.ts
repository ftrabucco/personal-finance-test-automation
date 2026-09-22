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

import type { CatalogosResponse, CatalogoItem } from '@api/catalogos.api'

/**
 * Finds a frecuencia by name (case-insensitive) in a /catalogos response.
 * Always use this instead of `frecuencias?.[0]` when the test will actually
 * trigger generation: the seeded catalog's first frequency is "Único", which
 * by design never generates via the scheduler (RecurringExpenseStrategy
 * treats it as a one-off, not a recurring source) — harmless for
 * definition-only CRUD tests, but silently breaks any test that calls
 * generatePending() and expects a gasto to come out.
 */
export function findFrecuencia(catalogosBody: CatalogosResponse, nombre: string): CatalogoItem | undefined {
  return catalogosBody.data?.frecuencias?.find(
    (frecuencia) => frecuencia.nombre_frecuencia?.toLowerCase() === nombre,
  )
}

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
 * Today +/- `offsetDays`, as YYYY-MM-DD. Only for boundary dates that are
 * many days away from today (fecha_inicio/fecha_fin fixtures) — offsets of a
 * day or two would be subject to the same UTC-vs-Buenos-Aires ambiguity
 * `todayInBuenosAires` exists to avoid.
 */
export function shiftedIsoDate(offsetDays: number) {
  const shifted = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return toIsoDate(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
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

function addMonthsWithDay(year: number, monthIndex0: number, months: number, day: number) {
  let targetMonth = monthIndex0 + months
  const targetYear = year + Math.floor(targetMonth / 12)
  targetMonth = ((targetMonth % 12) + 12) % 12
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth))
  return { year: targetYear, month: targetMonth, day: clampedDay }
}

/**
 * Mirrors the backend's CreditCardDateService.calculateDueDate: the first
 * cuota's due date depends on whether fecha_compra falls on/before or after
 * the card's closing day (dia_mes_cierre) for that month — before/on close,
 * it's due next month; after close, one cycle later. Every subsequent cuota
 * is exactly `cuotaNumero0Based` months after the first cuota's due date,
 * with the day clamped to the target month's length.
 */
export function creditCardDueDate(
  fechaCompraIso: string,
  diaCierre: number,
  diaVencimiento: number,
  cuotaNumero0Based: number,
) {
  const [year, month, day] = fechaCompraIso.split('-').map(Number)
  const compraMonth0 = month - 1

  const cierreDayThisMonth = Math.min(diaCierre, daysInMonth(year, compraMonth0))
  const compraOnOrBeforeCierre = day <= cierreDayThisMonth

  let cycleCloseYear = year
  let cycleCloseMonth0 = compraMonth0
  if (!compraOnOrBeforeCierre) {
    const nextClose = addMonthsWithDay(year, compraMonth0, 1, diaCierre)
    cycleCloseYear = nextClose.year
    cycleCloseMonth0 = nextClose.month
  }

  const firstDue = addMonthsWithDay(cycleCloseYear, cycleCloseMonth0, 1, diaVencimiento)

  if (cuotaNumero0Based === 0) {
    return toIsoDate(firstDue.year, firstDue.month, firstDue.day)
  }

  const subsequentDue = addMonthsWithDay(firstDue.year, firstDue.month, cuotaNumero0Based, diaVencimiento)
  return toIsoDate(subsequentDue.year, subsequentDue.month, subsequentDue.day)
}

const BUENOS_AIRES_TZ = 'America/Argentina/Buenos_Aires'

/**
 * Recurring expenses / automatic debits are gated by day-of-month
 * (`dia_de_pago`) and, for annual frequency, month-of-year (`mes_de_pago`),
 * both compared against `moment().tz('America/Argentina/Buenos_Aires')` on
 * the backend (see BaseRecurringStrategy.shouldGenerate). Using the test
 * runner's local/UTC calendar date here would make these tests flaky during
 * the ~3h window where Buenos Aires and UTC land on different calendar days
 * — the same class of bug fixed in personal-finance-api-nodeJS PR #38 — so
 * "today" for these tests is always computed in Buenos Aires time.
 */
function todayInBuenosAires() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUENOS_AIRES_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Today's date as YYYY-MM-DD in Buenos Aires time. */
export function todayIsoDateBuenosAires() {
  const { year, month, day } = todayInBuenosAires()
  return toIsoDate(year, month - 1, day)
}

/** Today's day-of-month (1-31) in Buenos Aires time. */
export function todayDayOfMonthBuenosAires() {
  return todayInBuenosAires().day
}

/** The given day-of-month, in the current Buenos Aires year/month, as YYYY-MM-DD. */
export function thisMonthIsoDateBuenosAires(day: number) {
  const { year, month } = todayInBuenosAires()
  return toIsoDate(year, month - 1, day)
}

/** Today's month-of-year (1-12) in Buenos Aires time. */
export function todayMonthNumberBuenosAires() {
  return todayInBuenosAires().month
}

/** A day-of-month (1-28) guaranteed to differ from `dayOfMonth`. */
export function otherDayOfMonth(dayOfMonth: number) {
  return dayOfMonth === 1 ? 2 : 1
}

/** A month-of-year (1-12) guaranteed to differ from `monthNumber`. */
export function otherMonthNumber(monthNumber: number) {
  return monthNumber === 1 ? 2 : 1
}
