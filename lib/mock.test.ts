import { strict as assert } from "node:assert"
import { test } from "node:test"

import { discussionNodes } from "./discussions.ts"
import { mockFetch } from "./mock.ts"
import { readStatuses } from "./pr-status.ts"
import { parseFollowed, parseNowPlaying, parseReleases, parseToken, recentReleases } from "./spotify.ts"
import { discussionSteps, discussionTimeline, issueSteps, issueTimeline, prSpans, prSteps, prTimeline } from "./timeline.ts"
import githubData from "./mock-data/github.json" with { type: "json" }

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timelineOf = (node: any) => ({ items: node.timelineItems.nodes, total: node.timelineItems.totalCount, truncated: node.timelineItems.pageInfo.hasPreviousPage })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repos = githubData.repos as Record<string, any>
const at = (url: string) => { const [owner, name, , number] = url.split("/").slice(3); return { owner, name, number: Number(number) } }

test("detail pages have timelines: a merged pull request with changes asked for and approved, one waiting for review, a closed issue, an answered discussion", async () => {
  const now = new Date().toISOString()
  const merged = (await graphql("pullRequest(number: $number)", at(repos["fremtind/jokul"].closedPulls[0].url))).data.repository.pullRequest
  const pull = { url: merged.url, author: merged.author?.login ?? null, created: merged.createdAt, state: merged.state, draft: merged.isDraft, merged: merged.mergedAt, closed: merged.closedAt, timeline: timelineOf(merged) }
  assert.equal(pull.state, "MERGED")
  assert.ok(pull.timeline.truncated, "more than 100 items: the oldest are left out, as GitHub does")
  const summaries = prTimeline(pull).map((event) => event.summary)
  for (const said of ["ba om endringer", "godkjente", "force-pushet"]) assert.ok(summaries.includes(said), said)
  assert.ok(summaries.some((summary) => summary.startsWith("merget")))
  assert.deepEqual(prSteps(pull, now).map((step) => step.state), ["done", "done", "done", "done", "done"])
  assert.ok(prSpans(pull, now).some((span) => span.label === "Endringer etterspurt"))

  const commits = (await graphql("pullRequest(number: $number)", at(repos["navikt/aksel"].closedPulls[0].url))).data.repository.pullRequest
  assert.ok(commits.timelineItems.nodes.filter((node: { __typename: string }) => node.__typename === "PullRequestCommit").length > 3)

  const waiting = (await graphql("pullRequest(number: $number)", at(repos["fremtind/jokul"].pulls.find((p: { requested: string[] }) => p.requested.length > 0).url))).data.repository.pullRequest
  const open = { url: waiting.url, author: waiting.author?.login ?? null, created: waiting.createdAt, state: waiting.state, draft: waiting.isDraft, merged: null, closed: null, timeline: timelineOf(waiting) }
  assert.ok(prTimeline(open).some((event) => event.summary.endsWith("om review")))
  assert.ok(prSteps(open, now).some((step) => step.state === "current"))

  const closed = (await graphql("issue(number: $number)", at(repos["navikt/aksel"].closedIssues[0].url))).data.repository.issue
  const issue = { url: closed.url, author: closed.author?.login ?? null, created: closed.createdAt, state: closed.state, stateReason: closed.stateReason, closed: closed.closedAt, assignees: [], timeline: timelineOf(closed) }
  assert.ok(issueTimeline(issue).some((event) => event.summary === "lukket som fullført"))
  assert.equal(issueSteps(issue, now).at(-1)?.label, "Lukket som fullført")

  const answered = repos["fremtind/jokul"].discussions.find((d: { answered: boolean | null }) => d.answered === true)
  const found = (await graphql("discussion(number: $number)", at(answered.url))).data.repository.discussion
  type Node = { id: string; url: string; createdAt: string; body: string; author: { login: string } | null; isAnswer: boolean; replies: { totalCount: number }; upvoteCount: number }
  const comment = (c: Node) => ({ id: c.id, url: c.url, createdAt: c.createdAt, body: c.body, author: c.author, isAnswer: c.isAnswer, replies: c.replies.totalCount, upvotes: c.upvoteCount })
  const thread = [...found.comments.nodes.map(comment), ...(found.answer === null || found.comments.nodes.some((c: Node) => c.id === found.answer.id) ? [] : [{ ...comment(found.answer), replyTo: found.answer.replyTo?.id }])]
  const discussion = { url: found.url, author: found.author.login, created: found.createdAt, answered: found.isAnswered, closed: found.closedAt, answerChosen: found.answerChosenAt, answerChosenBy: found.answerChosenBy?.login ?? null, thread: { items: thread, total: thread.length, truncated: false } }
  assert.ok(discussionTimeline(discussion).some((event) => event.badge === "Svar"))
  assert.equal(discussionSteps(discussion, now).at(-1)?.state, "done")
})

test("Spotify has a token, a song playing and recent releases, with covers that are files in public/", async () => {
  assert.equal(parseToken(await mockFetch("https://accounts.spotify.com/api/token", { body: "" }).json()), "mock-access-token")
  const playing = parseNowPlaying(await mockFetch("https://api.spotify.com/v1/me/player/currently-playing").json())
  assert.ok(playing !== null && playing.image?.startsWith("/start/mock/covers/"))
  const artists = parseFollowed(await mockFetch("https://api.spotify.com/v1/me/following?type=artist").json())
  const found = (await Promise.all(artists.map(async (artist) => parseReleases(await mockFetch(`https://api.spotify.com/v1/artists/${artist.id}/albums`).json(), artist.name)))).flat()
  assert.ok(recentReleases(found, new Date(), 60).length > 0)
})

test("the forecast starts no later than now and runs on; Entur's departures are around now", async () => {
  const forecast = (await mockFetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.92&lon=10.76").json()) as { properties: { timeseries: { time: string }[] } }
  const times = forecast.properties.timeseries.map((entry) => Date.parse(entry.time))
  assert.ok(times[0]! <= Date.now() && times.at(-1)! > Date.now() + 24 * HOUR)
  const near = (await mockFetch("https://api.entur.io/journey-planner/v3/graphql", { json: { query: "{ nearest(latitude:59.9226,longitude:10.7586,maximumDistance:1000" } }).json()) as { data: { nearest: { edges: { node: { place: { estimatedCalls: { expectedDepartureTime: string }[] } } }[] } } }
  const first = near.data.nearest.edges[0]!.node.place.estimatedCalls[0]!
  assert.ok(Math.abs(Date.parse(first.expectedDepartureTime) - Date.now()) < 2 * HOUR)
})

test("the stations near Grünerløkka show a delay, a cancellation with a notice, a timetable-only departure, platforms and trains", async () => {
  const near = (await mockFetch("https://api.entur.io/journey-planner/v3/graphql", { json: { query: "{ nearest(latitude:59.9226,longitude:10.7586,maximumDistance:1000" } }).json()) as { data: { nearest: { edges: { node: { distance: number; place: { estimatedCalls: { expectedDepartureTime: string; aimedDepartureTime: string; cancellation: boolean; realtime: boolean; quay: { publicCode: string } | null; situations: unknown[]; serviceJourney: { line: { publicCode: string; transportMode: string } } }[] } } }[] } } }
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
