import { env } from "./env"

/**
 * Fetches a source: through the relay (`upstream/`) when UPSTREAM_URL is set, as on lmfaole.party, where a Worker cannot
 * reach origins outside Cloudflare; straight to the source otherwise, as in `next dev`. Through the relay, the relay
 * adds the GitHub token.
 */
export async function upstream(url: string, init: { headers?: Record<string, string>; revalidate: number }): Promise<Response> {
  const relay = env("UPSTREAM_URL")
  const key = env("UPSTREAM_KEY")
  const target = new URL(url)
  const headers = { ...init.headers }
  if (relay && key) {
    delete headers.Authorization
    return fetch(`${relay.replace(/\/$/, "")}/${target.host}${target.pathname}${target.search}`, {
      headers: { ...headers, "X-Upstream-Key": key },
      next: { revalidate: init.revalidate },
    } as RequestInit)
  }
  return fetch(url, { headers, next: { revalidate: init.revalidate } } as RequestInit)
}
