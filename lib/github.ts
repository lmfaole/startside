import { env } from "./env"

export interface Item {
  key: string
  href: string
  title: string
  repo: string
  updated: string
}

export interface Github {
  reviews: Item[]
  mine: Item[]
  issues: Item[]
}

interface SearchResult {
  items: { id: number; html_url: string; title: string; repository_url: string; updated_at: string }[]
}

async function search(token: string, query: string): Promise<Item[]> {
  const response = await fetch(`https://api.github.com/search/issues?per_page=15&sort=updated&q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "startside", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 120 },
  } as RequestInit)
  if (!response.ok) throw new Error(`GitHub svarte ${response.status}`)
  const body = (await response.json()) as SearchResult
  return body.items.map((item) => ({
    key: String(item.id),
    href: item.html_url,
    title: item.title,
    repo: item.repository_url.replace("https://api.github.com/repos/", ""),
    updated: item.updated_at,
  }))
}

/** What GitHub wants from you today: pull requests to review, your own open pull requests, and issues assigned to you. */
export async function getGithub(): Promise<Github> {
  const token = env("GITHUB_TOKEN")
  if (!token) throw new Error("GITHUB_TOKEN er ikke satt")
  const [reviews, mine, issues] = await Promise.all([
    search(token, "is:open is:pr review-requested:@me archived:false"),
    search(token, "is:open is:pr author:@me archived:false"),
    search(token, "is:open is:issue assignee:@me archived:false"),
  ])
  return { reviews, mine, issues }
}
