import { env } from "./env"
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

interface Timeseries {
  time: string
  data: {
    instant: { details: { air_temperature: number; wind_speed: number } }
    next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
  }
}

/** The forecast from MET Norway (the data Yr shows) for the rest of the day, one entry per two hours. */
export async function getWeather(): Promise<Weather> {
  const place = env("WEATHER_PLACE") ?? "Oslo"
  const lat = env("WEATHER_LAT") ?? "59.91"
  const lon = env("WEATHER_LON") ?? "10.75"
  const response = await upstream(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    // MET's terms ask for an identifying User-Agent.
    headers: { "User-Agent": "startside github.com/lmfaole/startside" },
    revalidate: 600,
  })
  if (!response.ok) throw new Error(`Yr svarte ${response.status}`)
  const body = (await response.json()) as { properties: { timeseries: Timeseries[] } }
  const now = Date.now()
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const hours = body.properties.timeseries
    .filter((entry) => new Date(entry.time).getTime() >= now - 3_600_000 && new Date(entry.time).getTime() <= Math.max(endOfDay.getTime(), now + 8 * 3_600_000))
    .filter((_, index) => index % 2 === 0)
    .map((entry): Hour => {
      const next = entry.data.next_1_hours ?? entry.data.next_6_hours
      return {
        time: entry.time,
        temperature: entry.data.instant.details.air_temperature,
        precipitation: next?.details.precipitation_amount ?? 0,
        wind: entry.data.instant.details.wind_speed,
        symbol: next?.summary.symbol_code ?? "cloudy",
      }
    })
  return { place, hours }
}
