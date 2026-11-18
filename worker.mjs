// The Worker: the static files the build embedded (scripts/embed-assets.mjs), then Next for everything else.
import assets from "./.open-next/embedded-assets.mjs"
import next from "./.open-next/worker.js"

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js"

const decoded = new Map()

function bytes(path) {
  let body = decoded.get(path)
  if (body === undefined) {
    body = Uint8Array.from(atob(assets[path].body), (c) => c.charCodeAt(0))
    decoded.set(path, body)
  }
  return body
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const asset = assets[pathname]
    if (asset !== undefined && (request.method === "GET" || request.method === "HEAD")) {
      const immutable = pathname.includes("/_next/static/")
      return new Response(request.method === "HEAD" ? null : bytes(pathname), {
        headers: { "Content-Type": asset.type, "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600" },
      })
    }
    return next.fetch(request, env, ctx)
  },
}
