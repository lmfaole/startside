import { getCloudflareContext } from "@opennextjs/cloudflare"

import { STALE_SECONDS, verdict } from "./cache-policy"
import { env, mocking } from "./env"
import { mockFetch } from "./mock"
import { fingerprint } from "./summarize"

/**
 * Fetches a source: through the relay (`upstream/`) when UPSTREAM_URL is set, as on lmfaole.party, where a Worker cannot
 * reach origins outside Cloudflare; straight to the source otherwise, as in `next dev`. Through the relay, the relay
 * adds the GitHub token.
 */
async function fetchSource(url: string, init: { headers?: Record<string, string>; revalidate: number; /** How long past `revalidate` a kept answer may still be shown while it is asked for anew (default `STALE_SECONDS`; 0 for what must not be old, like what plays now). */ staleFor?: number; /** A JSON body makes it a POST (GitHub's GraphQL, which the relay allows). */ json?: unknown; /** A text body makes it a POST too (a form); the caller sets its Content-Type. */ body?: string }): Promise<Response> {
  if (mocking()) return mockFetch(url, init)
  const relay = env("UPSTREAM_URL")
  const key = env("UPSTREAM_KEY")
  const target = new URL(url)
  const headers: Record<string, string> = { ...init.headers, ...(init.json === undefined ? {} : { "Content-Type": "application/json" }) }
  const post = init.json !== undefined ? { method: "POST", body: JSON.stringify(init.json) } : init.body !== undefined ? { method: "POST", body: init.body } : {}
  if (relay && key) {
    // The relay holds GitHub's token.
    delete headers.Authorization
    return fetch(`${relay.replace(/\/$/, "")}/${target.host}${target.pathname}${target.search}`, {
      ...post,
      headers: { ...headers, "X-Upstream-Key": key },
      next: { revalidate: init.revalidate },
    } as RequestInit)
  }
  return fetch(url, { ...post, headers, next: { revalidate: init.revalidate } } as RequestInit)
}

/** The edge cache every Worker has next to its own requests; none in `next dev`, where a source is simply asked each time. */
const edgeCache = (): Cache | undefined => (typeof caches === "undefined" ? undefined : (caches as unknown as { default?: Cache }).default)

/**
 * Asks a source, and keeps an answer that was good in the edge cache (`revalidate` seconds fresh, then `STALE_SECONDS` more that may be shown at once while it is asked for anew in the background).
 * Next's own `revalidate` keeps nothing on Workers without an incremental cache, so without this every page, and every renewal of an open page, asked GitHub for everything again and waited.
 * An answer that is not ok is never kept. A request for the same address and the same body is the same question, whoever asks.
 */
export async function upstream(url: string, init: Parameters<typeof fetchSource>[1]): Promise<Response> {
  const cache = mocking() ? undefined : edgeCache()
  if (cache === undefined) return fetchSource(url, init)
  const staleFor = init.staleFor ?? STALE_SECONDS
  const key = new Request(`https://startside.invalid/upstream/${await fingerprint([url, JSON.stringify(init.json ?? null), init.body ?? ""])}`)
  const refresh = async (): Promise<Response> => {
    const response = await fetchSource(url, init)
    if (!response.ok) return response
    // 204 («nothing is playing») may not have a body, so it is kept as a 200 that says it was a 204.
    const empty = response.status === 204
    const body = empty ? "" : await response.arrayBuffer()
    const kept = new Response(body, { status: 200, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", "X-Fetched-At": String(Date.now()), "X-Upstream-Status": String(response.status), "Cache-Control": `public, max-age=${init.revalidate + staleFor}` } })
    await cache.put(key, kept)
    return empty ? new Response(null, { status: 204 }) : new Response(body, { status: response.status, headers: { "Content-Type": kept.headers.get("Content-Type") ?? "application/json" } })
  }
  const asKept = (found: Response): Response => (found.headers.get("X-Upstream-Status") === "204" ? new Response(null, { status: 204 }) : found)
  const found = await cache.match(key)
  if (found === undefined) return refresh()
  const age = (Date.now() - Number(found.headers.get("X-Fetched-At"))) / 1000
  const state = verdict(age, init.revalidate, staleFor)
  if (state === "expired") return refresh()
  if (state === "stale") {
    try {
      getCloudflareContext().ctx.waitUntil(refresh().catch(() => undefined))
    } catch {
      // No execution context to hand it to: the stale answer is shown, and the next ask fetches it.
    }
  }
  return asKept(found)
}
