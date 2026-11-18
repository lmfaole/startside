export const TIME_ZONE = "Europe/Oslo"

export type DayPart = "morgen" | "arbeidsdag" | "kveld" | "natt"

export interface Day {
  part: DayPart
  /** The Oslo hour, 0–23. */
  hour: number
  /** Saturday and Sunday, with the night after a Saturday or Sunday evening: the night after Friday is still a weekday. */
  weekend: boolean
  /** The date the day belongs to, `YYYY-MM-DD` in Oslo: before 05:00 it is still the day before. */
  date: string
}

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })

/** The Oslo date (`YYYY-MM-DD`) and hour of an instant. A Worker runs in UTC, so the zone is always named. */
export function osloTime(instant: Date): { date: string; hour: number } {
  const parts = Object.fromEntries(clock.formatToParts(instant).map((part) => [part.type, part.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/** `YYYY-MM-DD` plus a number of days. */
export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T12:00:00Z`)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

/** The Oslo date (`YYYY-MM-DD`) a number of days before an instant. */
export function osloDateDaysAgo(instant: Date, days: number): string {
  return addDays(osloTime(instant).date, -days)
}

/** Morning 05–09, workday 09–16, evening 16–22, night 22–05, in Oslo time. */
export function partOfHour(hour: number): DayPart {
  if (hour >= 5 && hour < 9) return "morgen"
  if (hour >= 9 && hour < 16) return "arbeidsdag"
  if (hour >= 16 && hour < 22) return "kveld"
  return "natt"
}

export function dayOf(instant: Date): Day {
  const { date: calendar, hour } = osloTime(instant)
  const date = hour < 5 ? addDays(calendar, -1) : calendar
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return { part: partOfHour(hour), hour, weekend: weekday === 0 || weekday === 6, date }
}

/** Now; in `next dev`, `NOW` (an ISO time) stands in for it, to see every time of day. Never read in production. */
export function now(override: string | undefined = process.env.NODE_ENV === "production" ? undefined : process.env.NOW): Date {
  const forced = override ? new Date(override) : undefined
  return forced !== undefined && !Number.isNaN(forced.getTime()) ? forced : new Date()
}
