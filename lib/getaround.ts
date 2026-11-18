import { getStops, getTrips } from "./entur"
import type { Journey } from "./places"
import { settle, type Settled } from "./settle"
import type { Stop, Trip } from "./transit"

export interface Around {
  journey: Journey
  stops: Settled<Stop[]>
  /** On foot and by public transport to where the reader is likely going; nothing when that is not known. */
  trips: Settled<{ walkSeconds: number | null; trips: Trip[] }> | null
}

/** What is around the reader and the way to where they are going, both asked for at once. */
export async function getAround(journey: Journey): Promise<Around> {
  const [stops, trips] = await Promise.all([settle(getStops(journey.from, journey.from.name === "Din posisjon" ? 1000 : 600)), journey.to === null ? null : settle(getTrips(journey.from, journey.to))])
  return { journey, stops, trips }
}
