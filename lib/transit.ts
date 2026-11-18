export type Mode = "walk" | "bus" | "tram" | "metro" | "other"

export interface Departure {
  /** ISO time of the expected departure. */
  time: string
  line: string
  destination: string
  mode: Mode
  realtime: boolean
  stop: string
}

export interface Stop {
  id: string
  name: string
  /** Metres from the place asked for. */
  distance: number
  departures: Departure[]
}

export interface Leg {
  mode: Mode
  line: string | null
  /** Seconds. */
  duration: number
}

export interface Trip {
  start: string
  end: string
  /** Seconds, door to door. */
  duration: number
  legs: Leg[]
}

export function modeOf(value: string | null | undefined): Mode {
  if (value === "foot") return "walk"
  return value === "bus" || value === "tram" || value === "metro" ? value : "other"
}

export const MODE_NAME: Record<Mode, string> = { walk: "Gå", bus: "Buss", tram: "Trikk", metro: "T-bane", other: "Tog" }

/** Whole minutes from `instant` to `time`, never below zero. */
export function minutesUntil(time: string, instant: Date): number {
  return Math.max(0, Math.round((new Date(time).getTime() - instant.getTime()) / 60_000))
}

export function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

/** The departures of all the stops, soonest first, with a limit. A call already gone is left out. */
export function nextDepartures(stops: readonly Stop[], instant: Date, limit: number): Departure[] {
  return stops
    .flatMap((stop) => stop.departures)
    .filter((departure) => new Date(departure.time).getTime() >= instant.getTime() - 30_000)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, limit)
}

/** The vehicle a trip is made with: the first leg that is not on foot. */
export function mainLeg(trip: Trip): Leg | null {
  return trip.legs.find((leg) => leg.mode !== "walk") ?? null
}

/** `Trikk 12`, or `Buss 54 og T-bane 4` when it changes, the way a trip is named. */
export function tripName(trip: Trip): string {
  const rides = trip.legs.filter((leg) => leg.mode !== "walk")
  return rides.length === 0 ? "Gå" : rides.map((leg) => `${MODE_NAME[leg.mode]}${leg.line === null ? "" : ` ${leg.line}`}`).join(" og ")
}

export interface Option {
  key: string
  trip: Trip
  name: string
  /** Minutes until it has to be left to get the trip. */
  leaveIn: number
  /** Minutes door to door. */
  minutes: number
  /** Minutes quicker than walking all the way (negative: slower). */
  saves: number
}

/** Trips compared with walking: when to leave, how long it takes, and how much it saves over going on foot. */
export function compare(walkSeconds: number | null, trips: readonly Trip[], instant: Date, limit: number): { walkMinutes: number | null; options: Option[] } {
  const walkMinutes = walkSeconds === null ? null : minutes(walkSeconds)
  const options = trips
    .filter((trip) => mainLeg(trip) !== null)
    .slice(0, limit)
    .map((trip): Option => ({ key: `${trip.start}-${tripName(trip)}`, trip, name: tripName(trip), leaveIn: minutesUntil(trip.start, instant), minutes: minutes(trip.duration), saves: walkMinutes === null ? 0 : walkMinutes - minutes(trip.duration) }))
  return { walkMinutes, options }
}
