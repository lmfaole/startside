import { cookies } from "next/headers"

import { env } from "./env"
import { DEFAULT_WORK, HOME_COOKIE, parseHome, type Spot } from "./places"
import { parsePosition, POSITION_COOKIE, type Position } from "./position"

/** Where the reader is, from the cookies the page keeps, and the workplace from the settings. */
export async function getContext(): Promise<{ position: Position | null; home: Spot | null; work: Spot }> {
  const jar = await cookies()
  const lat = Number(env("WORK_LAT"))
  const lon = Number(env("WORK_LON"))
  const work: Spot = Number.isFinite(lat) && Number.isFinite(lon) && env("WORK_LAT") !== undefined ? { name: env("WORK_NAME") ?? DEFAULT_WORK.name, lat, lon } : DEFAULT_WORK
  return { position: parsePosition(jar.get(POSITION_COOKIE)?.value), home: parseHome(jar.get(HOME_COOKIE)?.value), work }
}
