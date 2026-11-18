import { env } from "./env"

/**
 * Fetches a source: through the relay (`upstream/`) when UPSTREAM_URL is set, as on lmfaole.party, where a Worker cannot
 * reach origins outside Cloudflare; straight to the source otherwise, as in `next dev`. Through the relay, the relay
 * adds the GitHub token.
 */
export async function upstream(url: string, init: { headers?: Record<string, string>; revalidate: number; /** A JSON body makes it a POST (GitHub's GraphQL, which the relay allows). */ json?: unknown }): Promise<Response> {
  const relay = env("UPSTREAM_URL")
  const key = env("UPSTREAM_KEY")
  const target = new URL(url)
  const headers: Record<string, string> = { ...init.headers, ...(init.json === undefined ? {} : { "Content-Type": "application/json" }) }
  const post = init.json === undefined ? {} : { method: "POST", body: JSON.stringify(init.json) }
  if (relay && key) {
    delete headers.Authorization
    return fetch(`${relay.replace(/\/$/, "")}/${target.host}${target.pathname}${target.search}`, {
      ...post,
      headers: { ...headers, "X-Upstream-Key": key },
      next: { revalidate: init.revalidate },
    } as RequestInit)
  }
  return fetch(url, { ...post, headers, next: { revalidate: init.revalidate } } as RequestInit)
}
