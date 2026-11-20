/**
 * What the page keeps of Spotify's Web API: the song playing now, the artists you follow and what they have released lately, and how the token to ask with is made.
 * Pure, so a test pins it; `spotify-source.ts` does the asking. Spotify's Development Mode (one owner, Premium) has these endpoints and not the lists of new releases, so
 * «new music» is made here: the albums and singles of the artists you follow, newest first.
 */

export const TOKEN_URL = "https://accounts.spotify.com/api/token"
export const AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
/** What the page may see: what plays, and who is followed. Nothing that changes the account. */
export const SCOPE = "user-read-currently-playing user-follow-read"
export const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"
export const FOLLOWING_URL = "https://api.spotify.com/v1/me/following?type=artist&limit=50"
export const albumsUrl = (artistId: string): string => `https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&limit=5&market=NO`

export interface NowPlaying {
  track: string
  artist: string
  album: string
  image: string | null
  url: string
}

export interface Release {
  id: string
  title: string
  artist: string
  kind: "album" | "single"
  /** `YYYY-MM-DD`: a release with a date that is not to the day is left out. */
  date: string
  image: string | null
  url: string
}

type Json = Record<string, unknown>
const object = (value: unknown): Json => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : {})
const text = (value: unknown): string => (typeof value === "string" ? value : "")
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const SPOTIFY_URL = "https://open.spotify.com/"

type Request = { url: string; method: "POST"; headers: Record<string, string>; body: string }

const tokenRequest = (clientId: string, clientSecret: string, form: Record<string, string>): Request => ({
  url: TOKEN_URL,
  method: "POST",
  headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(form).toString(),
})

/** The request that swaps the refresh token for an access token (good for an hour). */
export const refreshRequest = (clientId: string, clientSecret: string, refreshToken: string): Request => tokenRequest(clientId, clientSecret, { grant_type: "refresh_token", refresh_token: refreshToken })

/** The access token from the token endpoint's answer, or `null` (a refresh token that has run out gives `invalid_grant`). */
export function parseToken(answer: unknown): string | null {
  const token = text(object(answer)["access_token"])
  return token === "" ? null : token
}

/** The song playing now, or `null` when nothing plays, it is paused, or it is not a song (an episode, an ad). */
export function parseNowPlaying(answer: unknown): NowPlaying | null {
  const state = object(answer)
  if (state["is_playing"] !== true || state["currently_playing_type"] !== "track") return null
  const item = object(state["item"])
  const track = text(item["name"])
  const url = text(object(item["external_urls"])["spotify"])
  if (track === "" || !url.startsWith(SPOTIFY_URL)) return null
  const artists = list(item["artists"]).map((artist) => text(object(artist)["name"])).filter((name) => name !== "")
  const album = object(item["album"])
  return { track, artist: artists.join(", "), album: text(album["name"]), image: pickImage(album["images"]), url }
}

/** The smallest cover that is still 300 wide (they come largest first), or the first. */
function pickImage(images: unknown): string | null {
  const found = list(images).map(object).filter((image) => text(image["url"]) !== "")
  const best = [...found].reverse().find((image) => typeof image["width"] === "number" && image["width"] >= 300) ?? found[0]
  return best === undefined ? null : text(best["url"])
}

/** The artists followed, as `{ id, name }`, from `/me/following`. */
export function parseFollowed(answer: unknown): { id: string; name: string }[] {
  return list(object(object(answer)["artists"])["items"]).flatMap((value) => {
    const artist = object(value)
    const id = text(artist["id"])
    const name = text(artist["name"])
    return id === "" || name === "" ? [] : [{ id, name }]
  })
}

/** The albums and singles of one artist (`/artists/{id}/albums`) with a release date to the day. */
export function parseReleases(answer: unknown, artist: string): Release[] {
  return list(object(answer)["items"]).flatMap((value): Release[] => {
    const album = object(value)
    const id = text(album["id"])
    const group = text(album["album_group"])
    const date = text(album["release_date"])
    const url = text(object(album["external_urls"])["spotify"])
    if (id === "" || text(album["name"]) === "" || (group !== "album" && group !== "single") || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !url.startsWith(SPOTIFY_URL)) return []
    return [{ id, title: text(album["name"]), artist, kind: group, date, image: pickImage(album["images"]), url }]
  })
}

/** The releases from the last `days` days (to the day, counted from `instant`), newest first, each release once (a single on an album by the same artist is two entries on Spotify). */
export function recentReleases(releases: readonly Release[], instant: Date, days: number): Release[] {
  const since = new Date(instant.getTime() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const today = instant.toISOString().slice(0, 10)
  const seen = new Set<string>()
  return releases
    .filter((release) => release.date >= since && release.date <= today)
    .filter((release) => {
      const key = `${release.artist}\u0000${release.title.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}

/** The address the person approves at, once (`npm run spotify:auth`); `redirectUri` is a loopback one registered in the Spotify dashboard. */
export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  return `${AUTHORIZE_URL}?${new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri, scope: SCOPE, state }).toString()}`
}

/** The request that swaps the code Spotify sent back for the refresh token. */
export const codeRequest = (clientId: string, clientSecret: string, code: string, redirectUri: string): Request => tokenRequest(clientId, clientSecret, { grant_type: "authorization_code", code, redirect_uri: redirectUri })

export function parseRefreshToken(answer: unknown): string | null {
  const token = text(object(answer)["refresh_token"])
  return token === "" ? null : token
}
