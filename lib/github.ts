import { discussionNodes, type DiscussionItem } from "./discussions"
import { isWatched, repoQualifiers, scope } from "./github-query"
import { env } from "./env"
import { readStatuses, withStatus, type PullStatus, type Statuses } from "./pr-status"
import { upstream } from "./upstream"

export interface Item {
  key: string
  href: string
  title: string
  repo: string
  created: string
  updated: string
  /** The logins it is assigned to. */
  assignees: string[]
  /** For a pull request: its checks, review and so on. */
  status?: PullStatus
}

interface SearchResult {
  items: { id: number; html_url: string; title: string; repository_url: string; created_at: string; updated_at: string; assignees?: { login: string }[] }[]
}

async function search(token: string | undefined, query: string, perPage = 15): Promise<Item[]> {
  const response = await upstream(`https://api.github.com/search/issues?per_page=${perPage}&sort=updated&q=${encodeURIComponent(query)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/vnd.github+json", "User-Agent": "startside", "X-GitHub-Api-Version": "2022-11-28" },
    revalidate: 60,
  })
  if (!response.ok) throw new Error(response.status === 500 ? await response.text() : `GitHub svarte ${response.status}`)
  const body = (await response.json()) as SearchResult
  return body.items.map((item) => ({
    key: String(item.id),
    href: item.html_url,
    title: item.title,
    repo: item.repository_url.replace("https://api.github.com/repos/", ""),
    created: item.created_at,
    updated: item.updated_at,
    assignees: (item.assignees ?? []).map((assignee) => assignee.login),
  }))
}

const PULLS = `query ($q: String!) {
  search(query: $q, type: ISSUE, first: 15) {
    nodes {
      ... on PullRequest {
        databaseId url title updatedAt isDraft reviewDecision mergeable additions deletions changedFiles
        repository { nameWithOwner }
        author { login }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
        reviewThreads(first: 50) { nodes { isResolved } }
      }
    }
  }
}`

/**
 * Pull requests: the list from the search, and their status from GraphQL where the token may read the pull requests
 * themselves. An organisation can block the one and not the other, so the list never depends on it: what GraphQL could
 * not read is shown without a status.
 */
async function pulls(token: string | undefined, query: string): Promise<Item[]> {
  const [items, statuses] = await Promise.all([search(token, `${query} is:pr`), graphql(token, query).catch((): Statuses => new Map())])
  return withStatus(items, statuses)
}

async function graphql(token: string | undefined, query: string): Promise<Statuses> {
  const response = await upstream("https://api.github.com/graphql", {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "User-Agent": "startside" },
    json: { query: PULLS, variables: { q: `${query} is:pr sort:updated-desc` } },
    revalidate: 60,
  })
  if (!response.ok) throw new Error(`GitHub (GraphQL) svarte ${response.status}`)
  return readStatuses((await response.json()) as Parameters<typeof readStatuses>[0])
}

function token(): string | undefined {
  const value = env("GITHUB_TOKEN")
  // Through the relay, the relay holds the token.
  if (!value && !env("UPSTREAM_URL")) throw new Error("GITHUB_TOKEN er ikke satt")
  return value
}

/** Your pull requests and the ones waiting for your review (public repositories only, see `scope`); `mine` leaves the reviews out. */
export async function getPulls(which: "all" | "mine"): Promise<{ reviews: Item[]; mine: Item[] }> {
  const limit = scope(env("GITHUB_EXCLUDE_ORGS"))
  const accessToken = token()
  const [reviews, mine] = await Promise.all([
    which === "all" ? pulls(accessToken, `is:open review-requested:@me archived:false ${limit}`) : Promise.resolve([]),
    pulls(accessToken, `is:open author:@me archived:false ${limit}`),
  ])
  return { reviews, mine }
}

/**
 * Issues, for `groupIssues`: the ones assigned to you in any public repository, the ones you are involved in in the
 * watched repositories (`GITHUB_WATCH_REPOS`), and the 50 that moved last there, from which the new ones nobody owns come.
 * Listing a repository's issues takes a search on the repository itself, which an organisation can block for the token
 * (SpareBank 1 does, for fine-grained tokens that live longer than 366 days): then those two groups are left out, and the
 * rest still shows, since «involved» searches by you and is filtered to the repositories here.
 */
export async function getIssues(): Promise<{ assigned: Item[]; involved: Item[]; recent: Item[] }> {
  const accessToken = token()
  const limit = scope(env("GITHUB_EXCLUDE_ORGS"))
  const watchedRepos = env("GITHUB_WATCH_REPOS")
  const watched = repoQualifiers(watchedRepos)
  const [assigned, involved, recent] = await Promise.all([
    search(accessToken, `is:open is:issue assignee:@me archived:false ${limit}`),
    search(accessToken, `is:open is:issue involves:@me archived:false ${limit}`, 50).then((items) => items.filter((item) => isWatched(item.repo, watchedRepos))),
    watched === ""
      ? []
      : search(accessToken, `is:open is:issue archived:false ${watched} ${limit}`, 50).catch((error: unknown): Item[] => {
          console.warn("Kunne ikke liste issues i de overvåkede repoene:", error instanceof Error ? error.message : error)
          return []
        }),
  ])
  return { assigned, involved, recent }
}

const DISCUSSIONS = `query ($involved: String!, $unanswered: String!) {
  involved: search(query: $involved, type: DISCUSSION, first: 20) { nodes { ...D } }
  unanswered: search(query: $unanswered, type: DISCUSSION, first: 20) { nodes { ...D } }
}
fragment D on Discussion {
  id url title createdAt updatedAt
  category { name }
  comments { totalCount }
  repository { nameWithOwner }
}`

/**
 * Discussions in the watched repositories: the ones you are in and the unanswered ones. GitHub has them in GraphQL only,
 * and an organisation can block that for the token (see `getIssues`), so a failure is an error here.
 */
export async function getDiscussions(): Promise<{ involved: DiscussionItem[]; unanswered: DiscussionItem[] }> {
  const watched = repoQualifiers(env("GITHUB_WATCH_REPOS"))
  if (watched === "") return { involved: [], unanswered: [] }
  const accessToken = token()
  const response = await upstream("https://api.github.com/graphql", {
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), "User-Agent": "startside" },
    json: { query: DISCUSSIONS, variables: { involved: `${watched} involves:@me sort:updated-desc`, unanswered: `${watched} is:unanswered sort:updated-desc` } },
    revalidate: 60,
  })
  if (!response.ok) throw new Error(response.status === 500 ? await response.text() : `GitHub (GraphQL) svarte ${response.status}`)
  const body = (await response.json()) as { data?: { involved: { nodes: Parameters<typeof discussionNodes>[0] }; unanswered: { nodes: Parameters<typeof discussionNodes>[0] } }; errors?: { message: string }[] }
  if (body.data === undefined) throw new Error(body.errors?.[0]?.message ?? "GitHub svarte uten data")
  return { involved: discussionNodes(body.data.involved.nodes), unanswered: discussionNodes(body.data.unanswered.nodes) }
}
