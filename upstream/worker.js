// A small relay on workers.dev for the start page. Workers on the lmfaole.party zone cannot reach origins outside
// Cloudflare (every such fetch ends in 525), while a fetch to workers.dev works, so the page fetches its sources here.
// Only GET, only the hosts below, and only with the key the page and this Worker share (UPSTREAM_KEY).
// GITHUB_TOKEN lives here, so the page never holds it.

const HOSTS = new Set(["api.met.no", "api.github.com", "nominatim.openstreetmap.org"])
const USER_AGENT = "startside github.com/lmfaole/startside"

export default {
  async fetch(request, env) {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 })
    if (!env.UPSTREAM_KEY || request.headers.get("X-Upstream-Key") !== env.UPSTREAM_KEY) return new Response("Forbidden", { status: 403 })

    const url = new URL(request.url)
    const [, host, ...rest] = url.pathname.split("/")
    if (!HOSTS.has(host)) return new Response("Unknown host", { status: 404 })

    const headers = new Headers({ "User-Agent": USER_AGENT, Accept: request.headers.get("Accept") ?? "application/json" })
    if (host === "api.github.com") {
      if (!env.GITHUB_TOKEN) return new Response("GITHUB_TOKEN er ikke satt", { status: 500 })
      headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`)
      headers.set("X-GitHub-Api-Version", "2022-11-28")
    }
    const response = await fetch(`https://${host}/${rest.join("/")}${url.search}`, { headers })
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } })
  },
}
