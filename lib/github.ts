import { env } from "./env"
import { upstream } from "./upstream"

export interface Item {
  key: string
  href: string
  title: string
  repo: string
  updated: string
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

function token(): string | undefined {
  const value = env("GITHUB_TOKEN")
  // Through the relay, the relay holds the token.
  if (!value && !env("UPSTREAM_URL")) throw new Error("GITHUB_TOKEN er ikke satt")
  return value
}

/** Pull requests that wait for your review. */
export const getReviews = (): Promise<Item[]> => search(token(), "is:open is:pr review-requested:@me archived:false")

/** Your own open pull requests. */
export const getMine = (): Promise<Item[]> => search(token(), "is:open is:pr author:@me archived:false")

/** Issues assigned to you. */
export const getIssues = (): Promise<Item[]> => search(token(), "is:open is:issue assignee:@me archived:false")
