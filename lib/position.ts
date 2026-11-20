export interface Position {
  lat: number
  lon: number
}

/** The cookie that holds the device's position: `lat,lon`, three decimals (about a hundred metres), for the nearest stations and the forecast. */
export const POSITION_COOKIE = "startside-pos"

/** A position from a cookie value; nothing for anything that is not a position on Earth. */
export function parsePosition(value: string | undefined): Position | null {
  if (value === undefined) return null
  const match = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(decodeURIComponent(value).trim())
  if (match === null) return null
  const lat = Number(match[1])
  const lon = Number(match[2])
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? roundPosition({ lat, lon }) : null
}

/** Three decimals: close enough to tell which stations are nearest, and the position leaves the device no more exactly than that. */
export function roundPosition({ lat, lon }: Position): Position {
  return { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 }
}

export function formatPosition({ lat, lon }: Position): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

/** Two decimals (about a kilometre), for the forecast: it does not change within a kilometre, and the cache keeps one for each. */
export function coarsePosition({ lat, lon }: Position): Position {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 }
}

/** Whether the device has moved far enough (about two hundred metres) for other stations to be the nearest ones. */
export function movedFar(from: Position, to: Position): boolean {
  // In thousandths of a degree, since 59.931 - 59.929 is not exactly 0.002; a degree of longitude is about half as long as one of latitude this far north.
  return Math.round(Math.abs(from.lat - to.lat) * 1000) >= 2 || Math.round(Math.abs(from.lon - to.lon) * 1000) >= 4
}
