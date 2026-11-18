import type { IconName } from "@lmfaole/designsystem/lib/icons"

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

/** The icon for one of Yr's symbol codes (`lightrainshowersandthunder_day`): thunder before rain before snow before fog before cloud before clear. */
export function weatherIcon(code: string): IconName {
  const base = code.replace(/_(day|night|polartwilight)$/, "")
  const night = code.endsWith("_night")
  if (base.includes("thunder")) return "thunder"
  if (base.includes("sleet") || base.includes("snow")) return "snow"
  if (base.includes("rain")) return "rain"
  if (base === "fog") return "fog"
  if (base === "cloudy") return "clouds"
  if (base === "clearsky") return night ? "moon" : "sun"
  return night ? "clouds" : "weather"
}

export interface Outlook {
  /** The Oslo date, `YYYY-MM-DD`. */
  date: string
  min: number
  max: number
  /** Millimetres over the day, as far as the forecast has it. */
  precipitation: number
  /** The symbol code at midday, or the first the day has. */
  symbol: string
}

/**
 * The coming days in one line each: lowest and highest temperature, rain, and the symbol at midday. Counted in Oslo dates,
 * starting the day after `date` (today and tomorrow are shown by the hour). The forecast has hourly entries for the first days
 * and six-hourly after, so the rain is read from `next_6_hours` at 00, 06, 12 and 18 where it is there and from the hourly
 * entries otherwise.
 */
export function dailyOutlook(timeseries: readonly Timeseries[], date: string, days: number): Outlook[] {
  const result: Outlook[] = []
  for (let offset = 2; offset < 2 + days; offset++) {
    const target = addDays(date, offset)
    const entries = timeseries.filter((entry) => osloTime(new Date(entry.time)).date === target)
    if (entries.length === 0) continue
    const temperatures = entries.map((entry) => entry.data.instant.details.air_temperature)
    const sixHourly = entries.filter((entry) => osloTime(new Date(entry.time)).hour % 6 === 0 && entry.data.next_6_hours !== undefined)
    const precipitation = sixHourly.length >= 3 ? sixHourly.reduce((sum, entry) => sum + (entry.data.next_6_hours?.details.precipitation_amount ?? 0), 0) : entries.reduce((sum, entry) => sum + (entry.data.next_1_hours?.details.precipitation_amount ?? 0), 0)
    const midday = entries.find((entry) => osloTime(new Date(entry.time)).hour === 12) ?? entries[0]
    result.push({
      date: target,
      min: Math.min(...temperatures),
      max: Math.max(...temperatures),
      precipitation: Math.round(precipitation * 10) / 10,
      symbol: midday?.data.next_6_hours?.summary.symbol_code ?? midday?.data.next_1_hours?.summary.symbol_code ?? "cloudy",
    })
  }
  return result
}
