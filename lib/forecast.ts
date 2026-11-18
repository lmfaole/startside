import { addDays, osloTime } from "./day.ts"

export interface Timeseries {
  time: string
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } }
    next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
  }
}

/**
 * The entries of a forecast that belong to a window, counted in Oslo time (a Worker runs in UTC): `today` is what is
 * left of the day `date`, one entry per two hours; `tomorrow` is the whole day after it, one per three hours.
 */
export function pickHours(timeseries: readonly Timeseries[], window: "today" | "tomorrow", date: string, instant: Date): Timeseries[] {
  const target = window === "today" ? date : addDays(date, 1)
  const inDay = timeseries.filter((entry) => {
    const time = new Date(entry.time)
    return osloTime(time).date === target && (window === "tomorrow" || time.getTime() >= instant.getTime() - 3_600_000)
  })
  return window === "today" ? inDay.filter((_, index) => index % 2 === 0) : inDay.filter((entry) => osloTime(new Date(entry.time)).hour % 3 === 0)
}
