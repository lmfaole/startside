import { upstream } from "./upstream"
import type { Spot } from "./places"
import { modeOf, type Departure, type Leg, type Stop, type Trip } from "./transit"

const JOURNEY_PLANNER = "https://api.entur.io/journey-planner/v3/graphql"
const HEADERS = { "ET-Client-Name": "lmfaole-startside" }

async function ask<T>(query: string, revalidate: number): Promise<T> {
  const response = await upstream(JOURNEY_PLANNER, { headers: HEADERS, revalidate, json: { query } })
  if (!response.ok) throw new Error(`Entur svarte ${response.status}`)
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (body.data === undefined) throw new Error(body.errors?.[0]?.message ?? "Entur svarte uten data")
  return body.data
}

interface NearestResult {
  nearest: { edges: { node: { distance: number; place: { id?: string; name?: string; estimatedCalls?: { expectedDepartureTime: string; realtime: boolean; destinationDisplay: { frontText: string } | null; serviceJourney: { line: { publicCode: string | null; transportMode: string | null } } }[] } } }[] }
}

/** The stops around a place with their next departures (Entur's Journey Planner), the nearest first. Stops with nothing leaving are left out. */
export async function getStops(spot: Spot, radius = 600): Promise<Stop[]> {
  const data = await ask<NearestResult>(
    `{ nearest(latitude:${spot.lat},longitude:${spot.lon},maximumDistance:${radius},maximumResults:8,filterByPlaceTypes:[stopPlace]){ edges{ node{ distance place{ ... on StopPlace{ id name estimatedCalls(numberOfDepartures:4,timeRange:5400){ expectedDepartureTime realtime destinationDisplay{frontText} serviceJourney{ line{publicCode transportMode} } } } } } } } }`,
    30,
  )
  return data.nearest.edges.flatMap(({ node }): Stop[] => {
    const { id, name, estimatedCalls } = node.place
    if (id === undefined || name === undefined || estimatedCalls === undefined || estimatedCalls.length === 0) return []
    const departures = estimatedCalls.map((call): Departure => ({ time: call.expectedDepartureTime, line: call.serviceJourney.line.publicCode ?? "", destination: call.destinationDisplay?.frontText ?? "", mode: modeOf(call.serviceJourney.line.transportMode), realtime: call.realtime, stop: name }))
    return [{ id, name, distance: node.distance, departures }]
  })
}

interface TripResult {
  walk: { tripPatterns: { duration: number }[] }
  transit: { tripPatterns: { expectedStartTime: string; expectedEndTime: string; duration: number; legs: { mode: string; duration: number; line: { publicCode: string | null } | null }[] }[] }
}

const coordinates = (spot: Spot) => `{coordinates:{latitude:${spot.lat},longitude:${spot.lon}}}`

/** The way between two places on foot, and by bus, tram and metro with the walks to and from the stops (Entur's Journey Planner). */
export async function getTrips(from: Spot, to: Spot): Promise<{ walkSeconds: number | null; trips: Trip[] }> {
  const data = await ask<TripResult>(
    `{ walk: trip(from:${coordinates(from)}, to:${coordinates(to)}, modes:{directMode:foot, transportModes:[]}, numTripPatterns:1){ tripPatterns{ duration } } transit: trip(from:${coordinates(from)}, to:${coordinates(to)}, modes:{accessMode:foot, egressMode:foot, transportModes:[{transportMode:bus},{transportMode:tram},{transportMode:metro}]}, numTripPatterns:5){ tripPatterns{ expectedStartTime expectedEndTime duration legs{ mode duration line{publicCode} } } } }`,
    30,
  )
  const trips = data.transit.tripPatterns.map((pattern): Trip => ({ start: pattern.expectedStartTime, end: pattern.expectedEndTime, duration: pattern.duration, legs: pattern.legs.map((leg): Leg => ({ mode: modeOf(leg.mode), line: leg.line?.publicCode ?? null, duration: leg.duration })) }))
  return { walkSeconds: data.walk.tripPatterns[0]?.duration ?? null, trips }
}
