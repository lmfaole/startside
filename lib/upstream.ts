import { getCloudflareContext } from "@opennextjs/cloudflare"

import { STALE_SECONDS, verdict } from "./cache-policy"
import { env } from "./env"
import { fingerprint } from "./summarize"

/**
 * Fetches a source: through the relay (`upstream/`) when UPSTREAM_URL is set, as on lmfaole.party, where a Worker cannot
 * reach origins outside Cloudflare; straight to the source otherwise, as in `next dev`. Through the relay, the relay
 * adds the GitHub token.
 */
async function fetchSource(url: string, init: { headers?: Record<string, string>; revalidate: number; /** A JSON body makes it a POST (GitHub's GraphQL, which the relay allows). */ json?: unknown }): Promise<Response> {
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

/** The edge cache every Worker has next to its own requests; none in `next dev`, where a source is simply asked each time. */
const edgeCache = (): Cache | undefined => (typeof caches === "undefined" ? undefined : (caches as unknown as { default?: Cache }).default)

/**
 * Asks a source, and keeps an answer that was good in the edge cache (`revalidate` seconds fresh, then `STALE_SECONDS` more that may be shown at once while it is asked for anew in the background).
 * Next's own `revalidate` keeps nothing on Workers without an incremental cache, so without this every page, and every renewal of an open page, asked GitHub for everything again and waited.
 * An answer that is not ok is never kept. A request for the same address and the same body is the same question, whoever asks.
 */
export async function upstream(url: string, init: Parameters<typeof fetchSource>[1]): Promise<Response> {
  const cache = edgeCache()
  if (cache === undefined) return fetchSource(url, init)
  const key = new Request(`https://startside.invalid/upstream/${await fingerprint([url, JSON.stringify(init.json ?? null)])}`)
  const refresh = async (): Promise<Response> => {
    const response = await fetchSource(url, init)
    if (!response.ok) return response
    const body = await response.arrayBuffer()
    const kept = new Response(body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", "X-Fetched-At": String(Date.now()), "Cache-Control": `public, max-age=${init.revalidate + STALE_SECONDS}` } })
    await cache.put(key, kept)
    return new Response(body, { status: response.status, headers: { "Content-Type": kept.headers.get("Content-Type") ?? "application/json" } })
  }
  const found = await cache.match(key)
  if (found === undefined) return refresh()
  const age = (Date.now() - Number(found.headers.get("X-Fetched-At"))) / 1000
  const state = verdict(age, init.revalidate, STALE_SECONDS)
  if (state === "expired") return refresh()
  if (state === "stale") {
    try {
      getCloudflareContext().ctx.waitUntil(refresh().catch(() => undefined))
    } catch {
      // No execution context to hand it to: the stale answer is shown, and the next ask fetches it.
    }
  }
  return found
}
