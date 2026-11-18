export interface Position {
  lat: number
  lon: number
}

/** The cookie that holds the device's position: `lat,lon`, two decimals (about a kilometre), for the forecast only. */
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

/** Two decimals: the forecast does not change within a kilometre, and the position leaves the device no more exactly than that. */
export function roundPosition({ lat, lon }: Position): Position {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 }
}

export function formatPosition({ lat, lon }: Position): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`
}

/** Whether the device has moved far enough (about two kilometres) for the page to fetch another forecast. */
export function movedFar(from: Position, to: Position): boolean {
  // In hundredths of a degree, since 59.93 - 59.91 is not exactly 0.02.
  return Math.round(Math.abs(from.lat - to.lat) * 100) >= 2 || Math.round(Math.abs(from.lon - to.lon) * 100) >= 4
}
