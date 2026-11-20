import { strict as assert } from "node:assert"
import { test } from "node:test"

import { discussionNodes } from "./discussions.ts"
import { mockFetch } from "./mock.ts"
import { readStatuses } from "./pr-status.ts"
import { parseFollowed, parseNowPlaying, parseReleases, parseToken, recentReleases } from "./spotify.ts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphql = async (query: string, variables?: unknown): Promise<any> => await mockFetch("https://api.github.com/graphql", { json: { query, variables } }).json()
const HOUR = 3_600_000

test("the captured GitHub data is moved to now: the newest thing is a few hours old at most", async () => {
  const reviews = (await mockFetch(`https://api.github.com/search/issues?q=${encodeURIComponent("is:open review-requested:@me is:pr")}`).json()) as { items: { updated_at: string }[] }
  const newest = Math.max(...reviews.items.map((item) => Date.parse(item.updated_at)))
  assert.ok(Date.now() - newest < 24 * HOUR && newest <= Date.now())
})

test("the pull request search and its statuses name the same pull requests, and the kinds do not overlap", async () => {
  const q = "is:open review-requested:@me archived:false is:public is:pr"
  const list = (await mockFetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}`).json()) as { items: { html_url: string }[] }
  const reviews = readStatuses(await graphql("search(query: $q", { q }))
  const mine = readStatuses(await graphql("search(query: $q", { q: "is:open author:@me is:pr" }))
  assert.ok(list.items.length > 0)
  assert.deepEqual(list.items.map((item) => item.html_url).sort(), [...reviews.keys()].sort())
  for (const href of reviews.keys()) assert.ok(!mine.has(href))
})

test("discussions come under the aliases the query asks for, and issues for a watched repository", async () => {
  const { data } = await graphql('query { involved: search(query: "involves:@me", type: DISCUSSION) r0: repository(owner: "navikt", name: "aksel") { discussions } }')
  assert.ok(discussionNodes(data["r0"].discussions.nodes).length > 0)
  const issues = (await mockFetch("https://api.github.com/repos/fremtind/jokul/issues?state=open").json()) as unknown[]
  assert.ok(issues.length > 0)
})

test("a detail is there for a captured pull request and null for one that is not", async () => {
  const [href] = [...readStatuses(await graphql("search(query: $q", { q: "is:open author:@me is:pr" })).keys()]
  const [owner, name] = href?.split("/").slice(3, 5) ?? []
  const found = await graphql("pullRequest(number: $number)", { owner, name, number: Number(href?.split("/").at(-1)) })
  assert.equal(found.data.repository.pullRequest.url, href)
  const missing = await graphql("pullRequest(number: $number)", { owner: "x", name: "y", number: 1 })
  assert.equal(missing.data.repository.pullRequest, null)
})

test("Spotify has a token, a song playing and recent releases, with covers that are files in public/", async () => {
  assert.equal(parseToken(await mockFetch("https://accounts.spotify.com/api/token", { body: "" }).json()), "mock-access-token")
  const playing = parseNowPlaying(await mockFetch("https://api.spotify.com/v1/me/player/currently-playing").json())
  assert.ok(playing !== null && playing.image?.startsWith("/start/mock/covers/"))
  const artists = parseFollowed(await mockFetch("https://api.spotify.com/v1/me/following?type=artist").json())
  const found = (await Promise.all(artists.map(async (artist) => parseReleases(await mockFetch(`https://api.spotify.com/v1/artists/${artist.id}/albums`).json(), artist.name)))).flat()
  assert.ok(recentReleases(found, new Date(), 60).length > 0)
})

test("the forecast starts no later than now and runs on; Entur's departures and trips are around now", async () => {
  const forecast = (await mockFetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.92&lon=10.76").json()) as { properties: { timeseries: { time: string }[] } }
  const times = forecast.properties.timeseries.map((entry) => Date.parse(entry.time))
  assert.ok(times[0]! <= Date.now() && times.at(-1)! > Date.now() + 24 * HOUR)
  const near = (await mockFetch("https://api.entur.io/journey-planner/v3/graphql", { json: { query: "{ nearest(latitude:59.9226,longitude:10.7586,maximumDistance:600" } }).json()) as { data: { nearest: { edges: { node: { place: { estimatedCalls: { expectedDepartureTime: string }[] } } }[] } } }
  const first = near.data.nearest.edges[0]!.node.place.estimatedCalls[0]!
  assert.ok(Math.abs(Date.parse(first.expectedDepartureTime) - Date.now()) < 2 * HOUR)
  const trips = (await mockFetch("https://api.entur.io/journey-planner/v3/graphql", { json: { query: "{ walk: trip(from:{coordinates:{latitude:59.9226,longitude:10.7586}}, to:{coordinates:{latitude:59.915013,longitude:10.751613}}" } }).json()) as { data: { transit: { tripPatterns: unknown[] } } }
  assert.ok(trips.data.transit.tripPatterns.length > 0)
})

test("the departures near home show a delay, a cancellation with a notice, a timetable-only departure, platforms and trains", async () => {
  const near = (await mockFetch("https://api.entur.io/journey-planner/v3/graphql", { json: { query: "{ nearest(latitude:59.9226,longitude:10.7586,maximumDistance:600" } }).json()) as { data: { nearest: { edges: { node: { distance: number; place: { estimatedCalls: { expectedDepartureTime: string; aimedDepartureTime: string; cancellation: boolean; realtime: boolean; quay: { publicCode: string } | null; situations: unknown[]; serviceJourney: { line: { publicCode: string; transportMode: string } } }[] } } }[] } } }
  const calls = near.data.nearest.edges.flatMap((edge) => edge.node.place.estimatedCalls)
  assert.ok(calls.some((c) => Date.parse(c.expectedDepartureTime) - Date.parse(c.aimedDepartureTime) === 4 * 60_000))
  assert.ok(calls.some((c) => c.cancellation && c.situations.length > 0))
  assert.ok(calls.some((c) => !c.realtime))
  assert.ok(calls.some((c) => c.quay?.publicCode))
  const modes = new Set(calls.map((c) => c.serviceJourney.line.transportMode))
  for (const mode of ["tram", "metro", "rail"]) assert.ok(modes.has(mode), mode)
  const far = near.data.nearest.edges.at(-1)!.node
  assert.ok(far.place.estimatedCalls.filter((c) => c.serviceJourney.line.publicCode === "5").length > 3)
  assert.ok(Date.parse(far.place.estimatedCalls[0]!.expectedDepartureTime) - Date.now() < (far.distance / 60) * 60_000)
})

test("Nominatim answers with a place, and an unknown host is a 404", async () => {
  const place = (await mockFetch("https://nominatim.openstreetmap.org/reverse?lat=59.92&lon=10.76").json()) as { address: { city: string } }
  assert.equal(place.address.city, "Oslo")
  assert.equal(mockFetch("https://example.com/").status, 404)
})
