import type { Day } from "./day.ts"
import type { Position } from "./position.ts"

/** A place with a name and a position: the workplace, home, or where the device is. */
export interface Spot {
  name: string
  lat: number
  lon: number
}

/** The cookie that holds the home position: `lat,lon`, three decimals (about a hundred metres), set on a tap and only read by the page. */
export const HOME_COOKIE = "startside-home"

/** Fremtind Forsikring, Hammersborggata 8 in Oslo; the settings (`WORK_NAME`, `WORK_LAT`, `WORK_LON`) replace it. */
export const DEFAULT_WORK: Spot = { name: "Fremtind", lat: 59.915013, lon: 10.751613 }

/** Within this many metres of a place, the device is at it. */
export const AT_PLACE = 400

export function parseHome(value: string | undefined): Spot | null {
  if (value === undefined) return null
  const match = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(decodeURIComponent(value).trim())
  if (match === null) return null
  const lat = Number(match[1])
  const lon = Number(match[2])
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { name: "Hjem", lat, lon } : null
}

export function formatHome({ lat, lon }: Pick<Spot, "lat" | "lon">): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

/** The straight line between two positions in metres (haversine). */
export function distance(a: Pick<Spot, "lat" | "lon">, b: Pick<Spot, "lat" | "lon">): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

export interface Journey {
  /** Where the reader is: the workplace or home when the device is at one (or, without a position, where the time of day says), else the device's position. */
  from: Spot
  /** Where the reader is likely going, when it is known. */
  to: Spot | null
}

/**
 * Where the reader is and where they are likely going, from the position of the device when there is one and the time of day
 * when there is not: a weekday morning is at home on the way to work, a workday at work, and an evening or a weekend at home.
 * Home is only known once it has been set; without it the journey is not known from the time of day.
 */
export function journeyFor({ position, work, home, day }: { position: Position | null; work: Spot; home: Spot | null; day: Pick<Day, "part" | "weekend"> }): Journey | null {
  const toWork = !day.weekend && (day.part === "morgen" || day.part === "arbeidsdag")
  const where = (): "work" | "home" | "away" | null => {
    if (position !== null) return distance(position, work) <= AT_PLACE ? "work" : home !== null && distance(position, home) <= AT_PLACE ? "home" : "away"
    if (!day.weekend && day.part === "arbeidsdag") return "work"
    return home === null ? null : "home"
  }
  const at = where()
  if (at === null) return null
  if (at === "work") return { from: work, to: home }
  if (at === "home") return home === null ? null : { from: home, to: work }
  return position === null ? null : { from: { name: "Din posisjon", ...position }, to: toWork || home === null ? work : home }
}
