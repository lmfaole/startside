import type { BoardDeparture } from "@lmfaole/designsystem/lib/departures"

export type Mode = "walk" | "bus" | "tram" | "metro" | "rail" | "ferry" | "other"

export interface Departure {
  /** ISO time of the expected departure. */
  time: string
  /** ISO time of the departure in the timetable. */
  aimed: string
  cancelled: boolean
  /** The platform or bay at the stop (`A`, `2`), when it has one. */
  quay: string | null
  /** A deviation for the departure (Entur's situation), in Norwegian when there is one. */
  notice: string | null
  line: string
  destination: string
  mode: Mode
  realtime: boolean
  stop: string
  /** Metres from the place asked for to the stop. */
  distance: number
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
  switch (value) {
    case "foot":
      return "walk"
    case "bus":
    case "coach":
      return "bus"
    case "tram":
    case "metro":
    case "rail":
      return value
    case "water":
      return "ferry"
    default:
      return "other"
  }
}

export const MODE_NAME: Record<Mode, string> = { walk: "Gå", bus: "Buss", tram: "Trikk", metro: "T-bane", rail: "Tog", ferry: "Båt", other: "Annet" }

/** A departure for the departure board, keyed by its stop, line, destination and time unless a key is given. */
export function toBoard(departure: Departure, key = `${departure.stop}-${departure.line}-${departure.destination}-${departure.aimed}`): BoardDeparture {
  return {
    key,
    line: departure.line,
    mode: departure.mode === "walk" ? "other" : departure.mode,
    destination: departure.destination,
    expected: departure.time,
    aimed: departure.aimed,
    realtime: departure.realtime,
    ...(departure.cancelled ? { cancelled: true } : {}),
    ...(departure.notice === null ? {} : { notice: departure.notice }),
    ...(departure.quay === null ? {} : { quay: departure.quay }),
  }
}

/** The first deviation of a departure (Entur's situations), in Norwegian when it is written in Norwegian, else in its first language. */
export function noticeOf(situations: readonly { summary: readonly { value: string; language: string | null }[] }[]): string | null {
  const summaries = situations.flatMap((situation) => situation.summary).filter((summary) => summary.value.trim() !== "")
  const norwegian = summaries.find((summary) => summary.language === "nob" || summary.language === "no" || summary.language === "nb")
  return (norwegian ?? summaries[0])?.value.trim() ?? null
}

/** Whole minutes from `instant` to `time`, never below zero. */
export function minutesUntil(time: string, instant: Date): number {
  return Math.max(0, Math.round((new Date(time).getTime() - instant.getTime()) / 60_000))
}

export function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

/** Minutes on foot over a distance in metres: about a metre a second, which allows for the streets not being straight. */
export function walkMinutesOver(metres: number): number {
  return Math.max(1, Math.round(metres / 60))
}

/** Minutes until the reader has to leave to catch a departure from where they are; below zero when it cannot be caught. */
export function leaveIn(departure: Departure, instant: Date): number {
  return Math.round((new Date(departure.time).getTime() - instant.getTime()) / 60_000) - walkMinutesOver(departure.distance)
}

/** The departures of all the stops that can still be caught on foot and are not cancelled, soonest first, with a limit. */
export function nextDepartures(stops: readonly Stop[], instant: Date, limit: number): Departure[] {
  return stops
    .flatMap((stop) => stop.departures)
    .filter((departure) => !departure.cancelled && leaveIn(departure, instant) >= 0)
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
