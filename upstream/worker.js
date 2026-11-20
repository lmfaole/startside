// A small relay on workers.dev for the start page. Workers on the lmfaole.party zone cannot reach origins outside
// Cloudflare (every such fetch ends in 525), while a fetch to workers.dev works, so the page fetches its sources here.
// Only GET (and POST to the GraphQL of GitHub and Entur, which is how they are asked), only the hosts below, and only with the key the page and this Worker share (UPSTREAM_KEY).
// GITHUB_TOKEN lives here, so the page never holds it.

const HOSTS = new Set(["api.met.no", "api.github.com", "nominatim.openstreetmap.org", "api.entur.io", "api.spotify.com"])
const USER_AGENT = "startside github.com/lmfaole/startside"

export default {
  async fetch(request, env) {
    if (!env.UPSTREAM_KEY || request.headers.get("X-Upstream-Key") !== env.UPSTREAM_KEY) return new Response("Forbidden", { status: 403 })

    const url = new URL(request.url)
    const [, host, ...rest] = url.pathname.split("/")
    const path = rest.join("/")
    if (!HOSTS.has(host) && !(host === "accounts.spotify.com" && path === "api/token")) return new Response("Unknown host", { status: 404 })
    // Spotify: the one POST is the token (`accounts.spotify.com/api/token`, a form), and what is asked of Spotify carries its own `Authorization` (an access token, or the client's sign-in): the relay holds no key of Spotify's.
    const spotifyToken = request.method === "POST" && host === "accounts.spotify.com" && path === "api/token"
    const graphql = request.method === "POST" && ((host === "api.github.com" && path === "graphql") || (host === "api.entur.io" && path === "journey-planner/v3/graphql"))
    if (host === "accounts.spotify.com" && !spotifyToken) return new Response("Unknown host", { status: 404 })
    if (request.method !== "GET" && !graphql && !spotifyToken) return new Response("Method not allowed", { status: 405 })

    const headers = new Headers({ "User-Agent": USER_AGENT, Accept: request.headers.get("Accept") ?? "application/json" })
    if (host === "api.github.com") {
      if (!env.GITHUB_TOKEN) return new Response("GITHUB_TOKEN er ikke satt", { status: 500 })
      headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`)
      headers.set("X-GitHub-Api-Version", "2022-11-28")
    }
    if (host === "api.entur.io") headers.set("ET-Client-Name", "lmfaole-startside")
    if (graphql) headers.set("Content-Type", "application/json")
    if (host === "api.spotify.com" || spotifyToken) {
      for (const name of ["authorization", "content-type"]) if (request.headers.has(name)) headers.set(name, request.headers.get(name))
    }
    const response = await fetch(`https://${host}/${rest.join("/")}${url.search}`, graphql || spotifyToken ? { method: "POST", headers, body: request.body } : { headers })
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } })
  },
}
