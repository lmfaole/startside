import type { Day } from "./day.ts"
import { env } from "./env"
import { pickHours, type Timeseries } from "./forecast.ts"
import { placeName } from "./place"
import type { Position } from "./position.ts"
import { upstream } from "./upstream"

export interface Hour {
  time: string
  temperature: number
  precipitation: number
  wind: number
  symbol: string
}

export interface Weather {
  place: string
  hours: Hour[]
}

const SYMBOLS: Record<string, string> = {
  clearsky: "Klarvær",
  fair: "Lettskyet",
  partlycloudy: "Delvis skyet",
  cloudy: "Skyet",
  fog: "Tåke",
  rain: "Regn",
  lightrain: "Lett regn",
  heavyrain: "Mye regn",
  sleet: "Sludd",
  lightsleet: "Lett sludd",
  heavysleet: "Mye sludd",
  snow: "Snø",
  lightsnow: "Lett snø",
  heavysnow: "Mye snø",
}

/** `lightrainshowersandthunder_day` becomes «Lett regn» with the part Yr's codes add (showers, thunder) put after. */
export function describeSymbol(code: string): string {
  const base = code.replace(/_(day|night|polartwilight)$/, "")
  const thunder = base.includes("andthunder")
  const plain = base.replace("showers", "").replace("andthunder", "")
  const text = SYMBOLS[plain] ?? "Skiftende"
  const showers = base.includes("showers") ? " (byger)" : ""
  return `${text}${showers}${thunder ? " og torden" : ""}`
}

export interface Forecast {
  place: string
  timeseries: Timeseries[]
}

/** The whole forecast from MET Norway (the data Yr shows) for the device's position, or for the place in the settings. */
export async function getForecast(position: Position | null = null): Promise<Forecast> {
  const lat = position?.lat ?? env("WEATHER_LAT") ?? "59.91"
  const lon = position?.lon ?? env("WEATHER_LON") ?? "10.75"
  const place = position === null ? (env("WEATHER_PLACE") ?? "Oslo") : ((await placeName(position.lat, position.lon)) ?? "din posisjon")
  const response = await upstream(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    // MET's terms ask for an identifying User-Agent.
    headers: { "User-Agent": "startside github.com/lmfaole/startside" },
    revalidate: 600,
  })
  if (!response.ok) throw new Error(`Yr svarte ${response.status}`)
  const body = (await response.json()) as { properties: { timeseries: Timeseries[] } }
  return { place, timeseries: body.properties.timeseries }
}

/** The entries of a forecast for the rest of the day or for the day after, as hours. */
export function hoursOf(forecast: Forecast, window: "today" | "tomorrow", day: Day, instant: Date): Hour[] {
  return pickHours(forecast.timeseries, window, day.date, instant).map((entry): Hour => {
    const next = entry.data.next_1_hours ?? entry.data.next_6_hours
    return {
      time: entry.time,
      temperature: entry.data.instant.details.air_temperature,
      precipitation: next?.details.precipitation_amount ?? 0,
      wind: entry.data.instant.details.wind_speed,
      symbol: next?.summary.symbol_code ?? "cloudy",
    }
  })
}
