import { env } from "./env"
import { readStatuses, withStatus, type PullStatus, type Statuses } from "./pr-status"
import { upstream } from "./upstream"

export interface Item {
  key: string
  href: string
  title: string
  repo: string
  updated: string
  /** For a pull request: its checks, review and so on. */
  status?: PullStatus
}

interface SearchResult {
  items: { id: number; html_url: string; title: string; repository_url: string; updated_at: string }[]
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
    updated: item.updated_at,
  }))
}

const PULLS = `query ($q: String!) {
  search(query: $q, type: ISSUE, first: 15) {
    nodes {
      ... on PullRequest {
        databaseId url title updatedAt isDraft reviewDecision mergeable
        repository { nameWithOwner }
        author { login }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
        reviewThreads(first: 50) { nodes { isResolved } }
      }
    }
  }
}`

export interface Listing {
  items: Item[]
  /** Why part of it is missing, in GitHub's words. */
  notice: string | null
}

/**
 * Pull requests: the list from the search (which reads what the token may see), and their status from GraphQL where it
 * may read the pull requests themselves. An organisation can block the one and not the other, so the list never depends on it.
 */
async function pulls(token: string | undefined, query: string): Promise<Listing> {
  const [items, statuses] = await Promise.all([
    search(token, `${query} is:pr`),
    graphql(token, query).catch((error: unknown): Statuses => ({ byUrl: new Map(), notice: error instanceof Error ? error.message : String(error) })),
  ])
  return { items: withStatus(items, statuses), notice: statuses.notice }
}

async function graphql(token: string | undefined, query: string): Promise<Statuses> {
  const response = await upstream("https://api.github.com/graphql", {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "User-Agent": "startside" },
    json: { query: PULLS, variables: { q: `${query} is:pr sort:updated-desc` } },
    revalidate: 120,
  })
  if (!response.ok) throw new Error(response.status === 500 ? await response.text() : `GitHub (GraphQL) svarte ${response.status}`)
  return readStatuses((await response.json()) as Parameters<typeof readStatuses>[0])
}

function token(): string | undefined {
  const value = env("GITHUB_TOKEN")
  // Through the relay, the relay holds the token.
  if (!value && !env("UPSTREAM_URL")) throw new Error("GITHUB_TOKEN er ikke satt")
  return value
}

/** Pull requests that wait for your review. */
export const getReviews = (): Promise<Listing> => pulls(token(), "is:open review-requested:@me archived:false")

/** Your own open pull requests. */
export const getMine = (): Promise<Listing> => pulls(token(), "is:open author:@me archived:false")

/** Issues assigned to you. */
export const getIssues = async (): Promise<Listing> => ({ items: await search(token(), "is:open is:issue assignee:@me archived:false"), notice: null })
