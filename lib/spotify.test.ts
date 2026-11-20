import { strict as assert } from "node:assert"
import { test } from "node:test"

import { authorizeUrl, codeRequest, parseFollowed, parseNowPlaying, parseReleases, parseToken, recentReleases, refreshRequest, SCOPE, type Release } from "./spotify.ts"

const PLAYING = {
  is_playing: true,
  currently_playing_type: "track",
  item: { name: "Submit", artists: [{ name: "Shygirl" }, { name: "Arca" }], album: { name: "SWALLOW!", images: [{ url: "l", width: 640 }, { url: "m", width: 300 }, { url: "s", width: 64 }] }, external_urls: { spotify: "https://open.spotify.com/track/a" } },
}

test("the song playing is read with its artists and the smallest cover that is 300 wide", () => {
  assert.deepEqual(parseNowPlaying(PLAYING), { track: "Submit", artist: "Shygirl, Arca", album: "SWALLOW!", image: "m", url: "https://open.spotify.com/track/a" })
})

test("nothing plays for a pause, an episode, an empty answer or a link that is not Spotify's", () => {
  assert.equal(parseNowPlaying({ ...PLAYING, is_playing: false }), null)
  assert.equal(parseNowPlaying({ ...PLAYING, currently_playing_type: "episode" }), null)
  assert.equal(parseNowPlaying(null), null)
  assert.equal(parseNowPlaying({ ...PLAYING, item: { ...PLAYING.item, external_urls: { spotify: "https://example.com" } } }), null)
})

test("the token request signs in with the client and carries the refresh token in the body; a refused one gives no token", () => {
  const request = refreshRequest("id", "secret", "r t")
  assert.equal(request.headers["Authorization"], `Basic ${btoa("id:secret")}`)
  assert.equal(request.body, "grant_type=refresh_token&refresh_token=r+t")
  assert.equal(parseToken({ access_token: "t" }), "t")
  assert.equal(parseToken({ error: "invalid_grant" }), null)
})

test("the followed artists are read with their ids, and a broken one is left out", () => {
  assert.deepEqual(parseFollowed({ artists: { items: [{ id: "1", name: "A" }, { id: "", name: "B" }, "junk"] } }), [{ id: "1", name: "A" }])
  assert.deepEqual(parseFollowed({}), [])
})

const album = (id: string, name: string, date: string, group = "album") => ({ id, name, album_group: group, release_date: date, images: [{ url: `${id}.jpg`, width: 300 }], external_urls: { spotify: `https://open.spotify.com/album/${id}` } })

test("a release has its day; one with a year or a month only, a compilation or a link that is not Spotify's is left out", () => {
  const got = parseReleases({ items: [album("a", "One", "2026-11-14", "single"), album("b", "Two", "2026-11"), album("c", "Three", "2026"), album("d", "Four", "2026-11-01", "compilation"), { ...album("e", "Five", "2026-11-02"), external_urls: { spotify: "https://x.com" } }] }, "Band")
  assert.deepEqual(got.map((release) => release.title), ["One"])
  assert.equal(got[0]?.kind, "single")
  assert.equal(got[0]?.artist, "Band")
})

const release = (title: string, artist: string, date: string): Release => ({ id: title, title, artist, kind: "album", date, image: null, url: "https://open.spotify.com/album/x" })

test("recent releases are the last weeks', newest first, one for each artist and title, and never from the future", () => {
  const instant = new Date("2026-11-20T12:00:00Z")
  const got = recentReleases([release("Old", "A", "2026-08-01"), release("New", "A", "2026-11-18"), release("new", "A", "2026-11-18"), release("Newer", "B", "2026-11-19"), release("Soon", "C", "2026-12-01")], instant, 60)
  assert.deepEqual(got.map((one) => one.title), ["Newer", "New"])
})

test("the sign-in asks to see what plays and who is followed, and nothing that changes the account", () => {
  const url = new URL(authorizeUrl("id", "http://127.0.0.1:8888/cb", "xyz"))
  assert.equal(url.searchParams.get("scope"), SCOPE)
  assert.ok(!/modify|write|library-modify/.test(SCOPE))
  assert.equal(codeRequest("i", "s", "c", "http://127.0.0.1:8888/cb").body, "grant_type=authorization_code&code=c&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcb")
})
