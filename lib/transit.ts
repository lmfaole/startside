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

/** Minutes on foot over a distance in metres: about a metre a second, which allows for the streets not being straight. */
export function walkMinutesOver(metres: number): number {
  return Math.max(1, Math.round(metres / 60))
}
