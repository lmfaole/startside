/**
 * What every upstream the page asks (GitHub, Entur, Yr, Nominatim, Spotify) answers with `MOCK_DATA=1` (see lib/upstream.ts), so the whole site runs in `next dev`
 * with no keys and no network. The answers are real ones, captured once from public, keyless endpoints by `scripts/fetch-mock-data.mjs` into `lib/mock-data/*.json`
 * (and the covers into `public/mock/covers/`), put in the shape of each source's own answer here, and moved in time to now, so they never look stale.
 * Pure: no environment, no network.
 */
import enturData from "./mock-data/entur.json" with { type: "json" }
import githubData from "./mock-data/github.json" with { type: "json" }
import nominatimData from "./mock-data/nominatim.json" with { type: "json" }
import spotifyData from "./mock-data/spotify.json" with { type: "json" }
import yrData from "./mock-data/yr.json" with { type: "json" }
import { BASE } from "./links.ts"

export interface MockInit {
  json?: unknown
  body?: string
}

const HOUR = 3_600_000
const DAY = 24 * HOUR
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/

const reply = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const notFound = (address: string): Response => reply({ message: `Ingen mock for ${address}` }, 404)

/** The same value with every timestamp in it moved by `ms`. */
function shift<T>(value: T, ms: number): T {
  if (typeof value === "string") return (ISO.test(value) ? new Date(Date.parse(value) + ms).toISOString() : value) as T
  if (Array.isArray(value)) return value.map((item) => shift(item, ms)) as T
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shift(item, ms)])) as T
  return value
}

function newest(value: unknown): number {
  if (typeof value === "string") return ISO.test(value) ? Date.parse(value) : 0
  if (Array.isArray(value)) return value.reduce<number>((latest, item) => Math.max(latest, newest(item)), 0)
  if (typeof value === "object" && value !== null) return Object.values(value).reduce<number>((latest, item) => Math.max(latest, newest(item)), 0)
  return 0
}

// GitHub ---------------------------------------------------------------------------------------------------------------------------------------------------

type Checks = "SUCCESS" | "FAILURE" | "PENDING" | null
type Decision = "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null
interface Run { name: string; status: string; conclusion: string | null }
interface Pull {
  id: number; number: number; url: string; title: string; author: string | null; created: string; updated: string; draft: boolean; mergeableState: string | null
  additions: number; deletions: number; files: number; head: string; base: string; labels: string[]; body: string; requested: string[]; comments: number
  reviews: { author: string; state: string; submitted: string; body: string }[]
  checks: { state: Checks; runs: Run[] }
  timeline?: Item[]
  /** Only on the closed ones: `MERGED` or `CLOSED`, and when. */
  state?: string; merged?: string | null; closed?: string | null
}
interface Issue {
  id: number; number: number; url: string; title: string; author: string | null; created: string; updated: string; assignees: string[]; labels: string[]; comments: number; body: string
  timeline?: Item[]
  state?: string; stateReason?: string | null; closed?: string | null
}
interface Comment { author: string; created: string; body: string }
interface ThreadComment { id: string; url: string; created: string; author: string | null; body: string; isAnswer: boolean; replies: number; upvotes: number; replyTo?: string }
interface Discussion {
  number: number; title: string; url: string; author: string; created: string; updated: string; category: string; comments: number; answered: boolean | null; body: string
  thread?: ThreadComment[]; answerChosen?: string | null; answerChosenBy?: string | null; closed?: string | null
}
/** A timeline item as scripts/fetch-mock-data.mjs keeps it: GraphQL's name for it, and the few fields there are of it. */
interface Item {
  type: string; id: string; at: string; actor: string | null; url?: string; body?: string; state?: string; name?: string | null; sha?: string; headline?: string
  label?: string; color?: string; subject?: string | null; reason?: string | null; merge?: string | null
  source?: { kind: string; number: number; title: string; url: string; state: string }
}
interface Repo {
  branch: string
  commit: { sha: string; url: string; headline: string; date: string; checks: { state: Checks } }
  issues: Issue[]
  pulls: Pull[]
  /** A merged pull request and a closed issue, found only by their detail pages. */
  closedPulls?: Pull[]
  closedIssues?: Issue[]
  issueComments: Record<string, Comment[]>
  discussions: Discussion[]
}
interface Github { me: string; repos: Record<string, Repo> }

/** The captured GitHub data, moved so that the newest thing in it happened two hours ago; the one that holds the repositories and what you do in them. */
function github(): { me: string; repos: [string, Repo][] } {
  const data = githubData as unknown as Github
  const moved = shift(data.repos, Date.now() - 2 * HOUR - newest(data.repos))
  const authors = Object.values(moved).flatMap((repo) => [...repo.issues.map((issue) => issue.author), ...repo.pulls.map((pull) => pull.author)])
  return { me: authors.includes("lmfaole") ? "lmfaole" : data.me, repos: Object.entries(moved) }
}

const isBot = (login: string | null): boolean => login?.includes("[bot]") === true
const asChecks = (state: Checks) => (state === null ? null : { state })
const nameOf = (repo: string, repos: [string, Repo][]): Repo | undefined => repos.find(([name]) => name.toLowerCase() === repo.toLowerCase())?.[1]

function decisionOf(pull: Pull): Decision {
  const latest = new Map(pull.reviews.map((review) => [review.author, review.state]))
  const states = [...latest.values()]
  if (states.includes("CHANGES_REQUESTED")) return "CHANGES_REQUESTED"
  if (states.includes("APPROVED")) return "APPROVED"
  return pull.requested.length > 0 ? "REVIEW_REQUIRED" : null
}
const mergeableOf = (pull: Pull): "MERGEABLE" | "CONFLICTING" | "UNKNOWN" => (pull.mergeableState === "dirty" ? "CONFLICTING" : pull.mergeableState === null || pull.mergeableState === "unknown" ? "UNKNOWN" : "MERGEABLE")

function pullsFor(query: string): { repo: string; pull: Pull }[] {
  const { me, repos } = github()
  const all = repos.flatMap(([repo, data]) => data.pulls.map((pull) => ({ repo, pull })))
  if (query.includes("author:app/dependabot")) return all.filter(({ pull }) => isBot(pull.author))
  if (query.includes("review-requested")) return all.filter(({ pull }) => pull.author !== me && !isBot(pull.author))
  return all.filter(({ pull }) => pull.author === me)
}

/** Issues assigned to you or made by you; with none of those in the captured data, the ones somebody is assigned to, so the lists are not empty. */
function issuesFor(kind: "assigned" | "involved"): { repo: string; issue: Issue }[] {
  const { me, repos } = github()
  const all = repos.flatMap(([repo, data]) => data.issues.map((issue) => ({ repo, issue })))
  const mine = all.filter(({ issue }) => issue.assignees.includes(me) || (kind === "involved" && issue.author === me))
  return mine.length > 0 ? mine : all.filter(({ issue }) => issue.assignees.length > 0 || kind === "involved").slice(0, 4)
}

const searchItem = (repo: string, item: { id: number; url: string; title: string; created: string; updated: string }, assignees: string[]) => ({
  id: item.id, html_url: item.url, title: item.title, repository_url: `https://api.github.com/repos/${repo}`, created_at: item.created, updated_at: item.updated, assignees: assignees.map((login) => ({ login })),
})

function search(q: string): unknown {
  if (q.includes("is:pr")) return { items: pullsFor(q).map(({ repo, pull }) => searchItem(repo, pull, [])) }
  return { items: issuesFor(/(^|\s)assignee:/.test(q) ? "assigned" : "involved").map(({ repo, issue }) => searchItem(repo, issue, issue.assignees)) }
}

const repoIssues = (repo: string): unknown => (nameOf(repo, github().repos)?.issues ?? []).map((issue) => ({ id: issue.id, html_url: issue.url, title: issue.title, created_at: issue.created, updated_at: issue.updated, assignees: issue.assignees.map((login) => ({ login })) }))

const prNode = ({ repo, pull }: { repo: string; pull: Pull }) => ({
  databaseId: pull.id, url: pull.url, title: pull.title, updatedAt: pull.updated, isDraft: pull.draft, reviewDecision: decisionOf(pull), mergeable: mergeableOf(pull),
  additions: pull.additions, deletions: pull.deletions, changedFiles: pull.files, repository: { nameWithOwner: repo }, author: pull.author === null ? null : { login: pull.author },
  commits: { nodes: [{ commit: { statusCheckRollup: asChecks(pull.checks.state) } }] }, reviewThreads: { nodes: [] },
})

const discussionNode = (repo: string, d: Discussion) => ({ id: `D_${repo}_${d.number}`, url: d.url, title: d.title, createdAt: d.created, updatedAt: d.updated, isAnswered: d.answered, category: { name: d.category }, comments: { totalCount: d.comments }, repository: { nameWithOwner: repo } })

const ALIAS = /(\w+): repository\(owner: "([^"]+)", name: "([^"]+)"\)/g

function discussions(query: string): unknown {
  const { me, repos } = github()
  const data: Record<string, unknown> = { involved: { nodes: repos.flatMap(([repo, entry]) => entry.discussions.filter((d) => d.author === me).map((d) => discussionNode(repo, d))) } }
  for (const [, alias, owner, name] of query.matchAll(ALIAS)) data[alias as string] = { discussions: { nodes: (nameOf(`${owner}/${name}`, repos)?.discussions ?? []).map((d) => discussionNode(`${owner}/${name}`, d)) } }
  return { data }
}

const repoNode = (repo: string, data: Repo) => ({
  nameWithOwner: repo, isArchived: false,
  defaultBranchRef: { name: data.branch, target: { oid: data.commit.sha, url: data.commit.url, messageHeadline: data.commit.headline, committedDate: data.commit.date, statusCheckRollup: asChecks(data.commit.checks.state) } },
})

function ci(query: string): unknown {
  const { repos } = github()
  const data: Record<string, unknown> = { user: { repositories: { nodes: repos.map(([repo, entry]) => repoNode(repo, entry)) } } }
  for (const [, alias, owner, name] of query.matchAll(ALIAS)) {
    const entry = nameOf(`${owner}/${name}`, repos)
    data[alias as string] = entry === undefined ? null : repoNode(`${owner}/${name}`, entry)
  }
  return { data }
}

/** The last comment of an issue and the last review of a pull request, as «involved» finds them: the replies are for the page to filter on who wrote them and when. */
function replies(): unknown {
  const { me, repos } = github()
  const issues = repos.flatMap(([repo, entry]) => Object.entries(entry.issueComments).flatMap(([number, comments]) => {
    const issue = entry.issues.find((candidate) => candidate.number === Number(number))
    const last = comments.at(-1)
    return issue === undefined || last === undefined ? [] : [{ id: `I_${repo}_${number}`, url: issue.url, title: issue.title, repository: { nameWithOwner: repo }, comments: { nodes: [{ author: { login: last.author }, createdAt: last.created }] } }]
  }))
  const pulls = repos.flatMap(([repo, entry]) => entry.pulls.flatMap((pull) => {
    const review = pull.reviews.at(-1)
    return review === undefined ? [] : [{ id: `PR_${repo}_${pull.number}`, url: pull.url, title: pull.title, repository: { nameWithOwner: repo }, comments: { nodes: [] }, reviews: { nodes: [{ author: { login: review.author }, submittedAt: review.submitted, state: review.state }] } }]
  }))
  return { data: { viewer: { login: me }, search: { nodes: [...issues, ...pulls] } } }
}

const toComment = (comment: Comment) => ({ author: { login: comment.author }, createdAt: comment.created, body: comment.body })
const login = (name: string | null | undefined) => (name === null || name === undefined ? null : { login: name })

/** A captured timeline item in the shape of GraphQL's `timelineItems` node. */
function timelineNode(item: Item): unknown {
  const actor = login(item.actor)
  const event = { __typename: item.type, id: item.id, createdAt: item.at, actor }
  switch (item.type) {
    case "IssueComment": return { __typename: item.type, id: item.id, url: item.url, createdAt: item.at, body: item.body ?? "", author: actor }
    case "PullRequestReview": return { __typename: item.type, id: item.id, url: item.url, createdAt: item.at, submittedAt: item.at, state: item.state, body: item.body ?? "", author: actor }
    case "PullRequestCommit": {
      const sha = item.sha ?? ""
      return { __typename: item.type, id: item.id, url: item.url, commit: { oid: sha, abbreviatedOid: sha.slice(0, 7), messageHeadline: item.headline ?? "", committedDate: item.at, url: item.url, author: { name: item.name ?? null, user: actor }, statusCheckRollup: null } }
    }
    case "ReviewRequestedEvent": return { ...event, requestedReviewer: item.subject ? { login: item.subject } : null }
    case "AssignedEvent": return { ...event, assignee: login(item.subject) }
    case "MergedEvent": return { ...event, url: item.url, mergeRefName: item.merge ?? null }
    case "ClosedEvent": return { ...event, url: item.url, stateReason: item.reason ?? null, closer: null }
    case "LabeledEvent":
    case "UnlabeledEvent": return { ...event, label: { name: item.label, color: item.color } }
    case "HeadRefForcePushedEvent": return { ...event, beforeCommit: null, afterCommit: null }
    case "ReviewDismissedEvent": return { ...event, url: item.url, review: null }
    case "CrossReferencedEvent": return { ...event, url: item.url, willCloseTarget: false, source: item.source === undefined ? null : { __typename: item.source.kind, number: item.source.number, title: item.source.title, url: item.source.url, state: item.source.state } }
    default: return { ...event, url: item.url }
  }
}

/** The newest 100 items, as `timelineItems(last: 100)` has them. */
function timelineItems(items: Item[] = []): unknown {
  return { totalCount: items.length, pageInfo: { hasPreviousPage: items.length > 100 }, nodes: items.slice(-100).map(timelineNode) }
}

function pullDetail(repo: string, number: number): unknown {
  const entry = nameOf(repo, github().repos)
  const pull = [...(entry?.pulls ?? []), ...(entry?.closedPulls ?? [])].find((candidate) => candidate.number === number)
  if (pull === undefined) return { data: { repository: { pullRequest: null } } }
  const state = pull.checks.state
  const reviews = pull.reviews
  return {
    data: {
      repository: {
        pullRequest: {
          title: pull.title, url: pull.url, state: pull.state ?? "OPEN", isDraft: pull.draft, body: pull.body, createdAt: pull.created, updatedAt: pull.updated, mergedAt: pull.merged ?? null, closedAt: pull.closed ?? null, author: pull.author === null ? null : { login: pull.author },
          headRefName: pull.head, baseRefName: pull.base, additions: pull.additions, deletions: pull.deletions, changedFiles: pull.files, reviewDecision: decisionOf(pull), mergeable: mergeableOf(pull),
          labels: { nodes: pull.labels.map((name) => ({ name })) }, reviewRequests: { nodes: pull.requested.map((login) => ({ requestedReviewer: { login } })) },
          latestReviews: { nodes: [...new Map(reviews.map((review) => [review.author, review])).values()].map((review) => ({ state: review.state, author: { login: review.author } })) },
          reviewThreads: { nodes: [] },
          commits: { nodes: [{ commit: { statusCheckRollup: state === null ? null : { state, contexts: { nodes: pull.checks.runs.map((run) => ({ __typename: "CheckRun", name: run.name, conclusion: run.conclusion?.toUpperCase() ?? null, status: run.status.toUpperCase() })) } } } }] },
          comments: { totalCount: pull.comments, nodes: reviews.filter((review) => review.body !== "").map((review) => toComment({ author: review.author, created: review.submitted, body: review.body })) },
          timelineItems: timelineItems(pull.timeline),
        },
      },
    },
  }
}

function issueDetail(repo: string, number: number): unknown {
  const entry = nameOf(repo, github().repos)
  const issue = [...(entry?.issues ?? []), ...(entry?.closedIssues ?? [])].find((candidate) => candidate.number === number)
  if (entry === undefined || issue === undefined) return { data: { repository: { issue: null } } }
  const closing = { stateReason: issue.stateReason ?? null, closedAt: issue.closed ?? null, timelineItems: timelineItems(issue.timeline) }
  return { data: { repository: { issue: { ...closing, title: issue.title, url: issue.url, state: issue.state ?? "OPEN", body: issue.body, createdAt: issue.created, updatedAt: issue.updated, author: issue.author === null ? null : { login: issue.author }, labels: { nodes: issue.labels.map((name) => ({ name })) }, assignees: { nodes: issue.assignees.map((login) => ({ login })) }, comments: { totalCount: issue.comments, nodes: (entry.issueComments[String(number)] ?? []).map(toComment) } } } } }
}

function discussionDetail(repo: string, number: number): unknown {
  const d = nameOf(repo, github().repos)?.discussions.find((candidate) => candidate.number === number)
  if (d === undefined) return { data: { repository: { discussion: null } } }
  const all = d.thread ?? []
  const thread = all.filter((comment) => comment.replyTo === undefined)
  const answer = all.find((comment) => comment.isAnswer)
  const node = (comment: ThreadComment) => ({ id: comment.id, url: comment.url, createdAt: comment.created, body: comment.body, isAnswer: comment.isAnswer, upvoteCount: comment.upvotes, replies: { totalCount: comment.replies }, author: login(comment.author) })
  return {
    data: {
      repository: {
        discussion: {
          title: d.title, url: d.url, body: d.body, createdAt: d.created, updatedAt: d.updated, isAnswered: d.answered, author: { login: d.author }, category: { name: d.category },
          answer: answer === undefined ? null : { ...node(answer), replyTo: answer.replyTo === undefined ? null : { id: answer.replyTo } },
          answerChosenAt: d.answerChosen ?? null, answerChosenBy: login(d.answerChosenBy), closedAt: d.closed ?? null,
          comments: {
            totalCount: Math.max(d.comments, thread.length), pageInfo: { hasPreviousPage: d.comments > thread.length },
            nodes: thread.map(node),
          },
        },
      },
    },
  }
}

function graphql(init: MockInit): Response {
  const { query = "", variables = {} } = (init.json ?? {}) as { query?: string; variables?: Record<string, unknown> }
  const ref = (): [string, number] => [`${String(variables["owner"])}/${String(variables["name"])}`, Number(variables["number"])]
  if (query.includes("pullRequest(number:")) return reply(pullDetail(...ref()))
  if (query.includes("issue(number:")) return reply(issueDetail(...ref()))
  if (query.includes("discussion(number:")) return reply(discussionDetail(...ref()))
  if (query.includes("type: DISCUSSION")) return reply(discussions(query))
  if (query.includes("user(login: $login)")) return reply(ci(query))
  if (query.startsWith("query Replies")) return reply(replies())
  if (query.includes("viewer { login }")) return reply({ data: { viewer: { login: github().me } } })
  if (query.includes("search(query: $q")) return reply({ data: { search: { nodes: pullsFor(String(variables["q"] ?? "")).map(prNode) } } })
  return reply({ errors: [{ message: "Ingen mock for denne spørringen" }] })
}

function githubAnswer(target: URL, init: MockInit): Response {
  if (target.pathname === "/graphql") return graphql(init)
  if (target.pathname === "/search/issues") return reply(search(target.searchParams.get("q") ?? ""))
  const user = /^\/users\/([^/]+)$/.exec(target.pathname)
  // Any username is a user in mock data: the lists come from the captured data, whoever is asked for.
  if (user !== null) return reply({ login: user[1], type: "User" })
  const repo = /^\/repos\/([^/]+\/[^/]+)$/.exec(target.pathname)
  if (repo !== null) return reply({ full_name: repo[1], private: false })
  const issues = /^\/repos\/([^/]+\/[^/]+)\/issues$/.exec(target.pathname)
  return issues === null ? notFound(target.href) : reply(repoIssues(issues[1] as string))
}

// Entur ----------------------------------------------------------------------------------------------------------------------------------------------------

const near = (lat: number, lon: number, spot: { lat: number; lon: number }): number => (lat - spot.lat) ** 2 + (lon - spot.lon) ** 2

interface Call {
  expectedDepartureTime: string
  aimedDepartureTime: string
  cancellation: boolean
  realtime: boolean
  quay: { publicCode: string | null } | null
  situations: { summary: { value: string; language: string }[] }[]
  destinationDisplay: { frontText: string } | null
  serviceJourney: { line: { publicCode: string | null; transportMode: string | null } }
}
interface Nearest { nearest: { edges: { node: { distance: number; place: { id?: string; name?: string; estimatedCalls?: Call[] } } }[] } }

const MINUTE = 60_000
const at = (now: number, minutes: number): string => new Date(now + minutes * MINUTE).toISOString()
const notice = (value: string) => [{ summary: [{ value: `${value} `, language: "en" }, { value, language: "no" }] }]

function call(now: number, minutes: number, line: string, mode: string, destination: string, quay: string, late = 0): Call {
  return { expectedDepartureTime: at(now, minutes + late), aimedDepartureTime: at(now, minutes), cancellation: false, realtime: true, quay: { publicCode: quay }, situations: [], destinationDisplay: { frontText: destination }, serviceJourney: { line: { publicCode: line, transportMode: mode } } }
}

/**
 * What the departure board has to show that a real capture seldom has: the captured answer at Grünerløkka with, at the nearest stop, a departure 4 minutes late, a
 * cancelled one with a notice, one only by the timetable and the platforms; and a made-up stop at the edge of the search with metro and trains, several of each
 * line within the hour, the first ones gone before the reader could walk there.
 */
export function enturDressed(captured: Nearest, now: number): Nearest {
  const edges = captured.nearest.edges.map((edge, index) => {
    const calls = edge.node.place.estimatedCalls
    if (index !== 0 || calls === undefined) return edge
    const estimatedCalls = calls.map((original, position): Call => {
      const dressed = { ...original, quay: { publicCode: original.quay?.publicCode || (position % 2 === 0 ? "A" : "B") } }
      if (position === 1) return { ...dressed, realtime: true, cancellation: false, expectedDepartureTime: new Date(Date.parse(original.aimedDepartureTime) + 4 * MINUTE).toISOString() }
      if (position === 2) return { ...dressed, cancellation: true, situations: notice("Innstilt på grunn av mangel på førere.") }
      if (position === 3) return { ...dressed, realtime: false, expectedDepartureTime: original.aimedDepartureTime }
      return dressed
    })
    estimatedCalls.sort((a, b) => a.expectedDepartureTime.localeCompare(b.expectedDepartureTime))
    return { node: { ...edge.node, place: { ...edge.node.place, estimatedCalls } } }
  })
  const station = [
    ...[2, 9, 17, 24, 32, 39, 47, 54].map((minutes) => call(now, minutes, "5", "metro", "Vestli", "1")),
    ...[4, 19, 34, 49].map((minutes) => call(now, minutes, "L1", "rail", "Spikkestad", "4")),
    call(now, 12, "R14", "rail", "Kongsberg", "8", 4),
    { ...call(now, 42, "R14", "rail", "Kongsberg", "8"), realtime: false },
    { ...call(now, 27, "RE11", "rail", "Skien", "9"), cancellation: true, situations: notice("Toget er innstilt på grunn av sporarbeid. Buss for tog fra Oslo S.") },
  ].sort((a, b) => a.expectedDepartureTime.localeCompare(b.expectedDepartureTime))
  edges.push({ node: { distance: 590, place: { id: "MOCK:StopPlace:grunerlokka-stasjon", name: "Grünerløkka stasjon", estimatedCalls: station } } })
  return { nearest: { edges } }
}

function entur(query: string): Response {
  const moved = shift(enturData, Date.now() - Date.parse(enturData.capturedAt))
  const { grunerlokka, sentrum } = moved.spots
  if (!query.includes("nearest(")) return notFound(`Entur: ${query.slice(0, 40)}`)
  // Any position gets the stations of the captured place it is closest to.
  const [, lat, lon] = /latitude:([\d.-]+),longitude:([\d.-]+)/.exec(query) ?? []
  return reply({ data: near(Number(lat), Number(lon), sentrum) < near(Number(lat), Number(lon), grunerlokka) ? moved.nearest.sentrum : enturDressed(moved.nearest.grunerlokka as Nearest, Date.now()) })
}

// Yr and Nominatim -----------------------------------------------------------------------------------------------------------------------------------------

/** The forecast moved by whole days, so each hour keeps its time of day (night stays night) and the series starts no later than now. */
function yr(): Response {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(yrData.capturedAt)) / DAY))
  return reply(shift(yrData.answer, days * DAY))
}

// Spotify (from Deezer's real records and covers, in Spotify's shape) ---------------------------------------------------------------------------------------

interface Artist { id: string; name: string; albums: { id: string; cover: string; title: string; kind: string; date: string }[]; top: { title: string; album: string; cover: string } | null }

const cover = (id: string) => ({ url: `${BASE}/mock/covers/${id}.jpg`, width: 500 })
const searchUrl = (...words: string[]): string => `https://open.spotify.com/search/${encodeURIComponent(words.join(" "))}`

/** The release dates moved so that the newest of all is three days old: «new music» is then what the real spacing between releases says. */
function artists(): Artist[] {
  const all = (spotifyData as unknown as { artists: Artist[] }).artists
  const latest = Math.max(...all.flatMap((artist) => artist.albums.map((album) => Date.parse(album.date))))
  const days = Math.round((Date.now() - 3 * DAY - latest) / DAY)
  return all.map((artist) => ({ ...artist, albums: artist.albums.map((album) => ({ ...album, date: new Date(Date.parse(album.date) + days * DAY).toISOString().slice(0, 10) })) }))
}

function spotify(target: URL): Response {
  if (target.pathname === "/v1/me/player/currently-playing") {
    const playing = artists().find((artist) => artist.top !== null)
    if (playing?.top == null) return new Response(null, { status: 204 })
    return reply({ is_playing: true, currently_playing_type: "track", item: { name: playing.top.title, external_urls: { spotify: searchUrl(playing.top.title, playing.name) }, artists: [{ name: playing.name }], album: { name: playing.top.album, images: [cover(playing.top.cover)] } } })
  }
  if (target.pathname === "/v1/me/following") return reply({ artists: { items: artists().map(({ id, name }) => ({ id, name })) } })
  const albums = /^\/v1\/artists\/([^/]+)\/albums$/.exec(target.pathname)
  if (albums === null) return notFound(target.href)
  const artist = artists().find((candidate) => candidate.id === decodeURIComponent(albums[1] as string))
  return reply({ items: (artist?.albums ?? []).map((album) => ({ id: album.id, name: album.title, album_group: album.kind, release_date: album.date, external_urls: { spotify: searchUrl(album.title, artist?.name ?? "") }, images: [cover(album.cover)] })) })
}

/** A short summary in Norwegian for a page, in place of the model that only runs on Cloudflare. */
export function mockSummary(): string {
  return "Dette er en lokal eksempeltekst: endringen er liten, testene går gjennom, og det eneste som gjenstår er en gjennomgang. Ingenting er hentet fra en KI-modell."
}

/** The answer a source would have given, for `MOCK_DATA=1`: by host and path, from the captured fixtures. */
export function mockFetch(address: string, init: MockInit = {}): Response {
  const target = new URL(address)
  switch (target.host) {
    case "api.github.com":
      return githubAnswer(target, init)
    case "api.entur.io":
      return entur(String((init.json as { query?: string } | undefined)?.query ?? ""))
    case "api.met.no":
      return yr()
    case "nominatim.openstreetmap.org":
      return reply(nominatimData)
    case "accounts.spotify.com":
      return reply({ access_token: "mock-access-token", token_type: "Bearer", expires_in: 3600 })
    case "api.spotify.com":
      return spotify(target)
    default:
      return notFound(address)
  }
}
