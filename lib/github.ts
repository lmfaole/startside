import { scope } from "./github-query"
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
  /** For a pull request: its checks, review and so on. */
  status?: PullStatus
}

interface SearchResult {
  items: { id: number; html_url: string; title: string; repository_url: string; created_at: string; updated_at: string }[]
}

async function search(token: string | undefined, query: string): Promise<Item[]> {
  const response = await upstream(`https://api.github.com/search/issues?per_page=15&sort=updated&q=${encodeURIComponent(query)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/vnd.github+json", "User-Agent": "startside", "X-GitHub-Api-Version": "2022-11-28" },
    revalidate: 120,
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
    revalidate: 120,
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

/** Issues assigned to you. */
export const getIssues = (): Promise<Item[]> => search(token(), `is:open is:issue assignee:@me archived:false ${scope(env("GITHUB_EXCLUDE_ORGS"))}`)
