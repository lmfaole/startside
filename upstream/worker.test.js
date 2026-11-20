import { strict as assert } from "node:assert"
import { afterEach, test } from "node:test"

import relay from "./worker.js"

const ENV = { UPSTREAM_KEY: "shared", GITHUB_TOKEN: "gh-secret" }
const real = globalThis.fetch
afterEach(() => {
  globalThis.fetch = real
})

function spy(status = 200) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(status === 204 ? null : "{}", { status })
  }
  return calls
}

const ask = (path, init = {}) => {
  const { key = "shared", ...rest } = init
  const headers = new Headers(rest.headers)
  if (key !== null) headers.set("X-Upstream-Key", key)
  return relay.fetch(new Request(`https://relay.example${path}`, { ...rest, headers }), ENV)
}

test("without the shared key nothing is asked", async () => {
  const calls = spy()
  assert.equal((await ask("/api.spotify.com/v1/me", { key: null })).status, 403)
  assert.equal(calls.length, 0)
})

test("Spotify: what is asked carries its own sign-in, and the GitHub token is never given to it", async () => {
  const calls = spy()
  await ask("/api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: "Bearer abc" } })
  const headers = new Headers(calls[0].init.headers)
  assert.equal(calls[0].url, "https://api.spotify.com/v1/me/player/currently-playing")
  assert.equal(headers.get("authorization"), "Bearer abc")
})

test("the one POST to Spotify is the token, with the client's sign-in and the form; any other path on its accounts host is not found", async () => {
  const calls = spy()
  await ask("/accounts.spotify.com/api/token", { method: "POST", body: "grant_type=refresh_token", headers: { Authorization: "Basic xyz", "Content-Type": "application/x-www-form-urlencoded" } })
  assert.equal(calls[0].url, "https://accounts.spotify.com/api/token")
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Basic xyz")
  assert.equal((await ask("/accounts.spotify.com/authorize")).status, 404)
  assert.equal((await ask("/accounts.spotify.com/api/token")).status, 404)
  assert.equal((await ask("/api.spotify.com/v1/me", { method: "POST", body: "x" })).status, 405)
  assert.equal(calls.length, 1)
})

test("GitHub still gets the relay's token and ignores the caller's; other hosts are unknown; nothing playing (204) passes through", async () => {
  const calls = spy()
  await ask("/api.github.com/user", { headers: { Authorization: "Bearer from-the-page" } })
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer gh-secret")
  assert.equal((await ask("/example.com/x")).status, 404)
  spy(204)
  assert.equal((await ask("/api.spotify.com/v1/me/player/currently-playing")).status, 204)
})
