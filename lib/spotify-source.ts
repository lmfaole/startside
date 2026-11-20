import { env } from "./env"
import { albumsUrl, FOLLOWING_URL, NOW_PLAYING_URL, parseFollowed, parseNowPlaying, parseReleases, parseToken, recentReleases, refreshRequest, type NowPlaying, type Release } from "./spotify"
import { upstream } from "./upstream"

/** How many followed artists are asked for their albums: one ask each, and a Worker may make only so many in a page. */
const ARTISTS = 30
/** How far back a release is «new». */
export const NEW_FOR_DAYS = 60

const AGENT = { "User-Agent": "startside github.com/lmfaole/startside" }

/**
 * The access token (an hour), made from the refresh token and kept for 40 minutes, so no page asks for a token each time. Spotify content may only be kept as long as it
 * makes the page quicker (their terms): a token is no content, the answers below are kept for minutes, and nothing is stored.
 */
async function accessToken(): Promise<string | null> {
  const [clientId, secret, refresh] = [env("SPOTIFY_CLIENT_ID"), env("SPOTIFY_CLIENT_SECRET"), env("SPOTIFY_REFRESH_TOKEN")]
  if (clientId === undefined || secret === undefined || refresh === undefined) return null
  const request = refreshRequest(clientId, secret, refresh)
  const response = await upstream(request.url, { headers: request.headers, body: request.body, revalidate: 2400, staleFor: 0 })
  return response.ok ? parseToken(await response.json()) : null
}

async function ask(path: string, token: string, revalidate: number, staleFor?: number): Promise<unknown> {
  const response = await upstream(path, { headers: { ...AGENT, Authorization: `Bearer ${token}` }, revalidate, ...(staleFor === undefined ? {} : { staleFor }) })
  if (response.status === 204) return null
  if (!response.ok) throw new Error(`Spotify svarte ${response.status}`)
  return response.json()
}

/** The song playing now, or `null` (nothing plays, Spotify is not set up, or the sign-in has run out). Never shown old: 15 seconds at most. */
export async function getNowPlaying(): Promise<NowPlaying | null> {
  const token = await accessToken()
  if (token === null) return null
  return parseNowPlaying(await ask(NOW_PLAYING_URL, token, 15, 0))
}

/** Releases from the last weeks by the artists you follow, newest first. Followed artists are kept for an hour, each artist's albums for an hour. */
export async function getReleases(instant: Date): Promise<Release[]> {
  const token = await accessToken()
  if (token === null) return []
  const artists = parseFollowed(await ask(FOLLOWING_URL, token, 3600)).slice(0, ARTISTS)
  const found: Release[] = []
  // Six at a time: a Worker keeps no more than six connections open.
  for (let start = 0; start < artists.length; start += 6) {
    const batch = await Promise.all(
      artists.slice(start, start + 6).map(async (artist) => {
        try {
          return parseReleases(await ask(albumsUrl(artist.id), token, 3600), artist.name)
        } catch {
          return []
        }
      }),
    )
    found.push(...batch.flat())
  }
  return recentReleases(found, instant, NEW_FOR_DAYS)
}
