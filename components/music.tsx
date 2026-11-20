import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { BrandIcon } from "@lmfaole/designsystem/components/brand-icon"
import { Inline } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { details, PictureRows } from "@lmfaole/designsystem/components/picture-rows"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { Text } from "@lmfaole/designsystem/components/text"

import { short } from "../lib/format"
import { withBase } from "../lib/links"
import type { Settled } from "../lib/settle"
import type { NowPlaying, Release } from "../lib/spotify"
import { NEW_FOR_DAYS } from "../lib/spotify-source"

/** How many new releases the front page shows: the digest of a list that has a page of its own. */
const DIGEST_RELEASES = 3
export const MUSIC_PATH = withBase("/musikk")

/**
 * Where Spotify's content comes from: their mark, in the text colour (one colour, never on the cover art), 28 px, above Spotify's 21 px minimum. Content from Spotify is always
 * attributed to Spotify and links back to it (their developer policy), so every part that shows it has this and its items link to Spotify.
 */
function FromSpotify() {
  return (
    <Inline gap="sm">
      <BrandIcon name="spotify" size="xl" decorative />
      <Text size="sm" tone="muted">
        Fra Spotify
      </Text>
    </Inline>
  )
}

/** The song playing now, first on the front page and gone when nothing plays. The title is the link back to the song on Spotify. */
export function NowPlayingSection({ now }: { now: NowPlaying | null }) {
  if (now === null) return null
  return (
    <PageSection id="spilles-na" title="Spilles nå" icon="music">
      <Stack gap="md">
        <PictureRows ratio="square" rows={[{ key: now.url, picture: now.image, title: <ExternalLink href={now.url}>{now.track}</ExternalLink>, detail: details([now.artist, now.album]), aside: "nå" }]} />
        <FromSpotify />
      </Stack>
    </PageSection>
  )
}

/** A release's day, as the calendar date it has (no time of day, so no time zone moves it). */
const day = (date: string): string => short.format(new Date(`${date}T12:00:00Z`))

function rows(releases: readonly Release[]) {
  return releases.map((release) => ({
    key: release.id,
    picture: release.image,
    title: <ExternalLink href={release.url}>{release.title}</ExternalLink>,
    detail: details([release.artist, release.kind === "album" ? "Album" : "Singel"]),
    aside: day(release.date),
  }))
}

/** New albums and singles by the artists you follow: three on the front page, all of them on the page of their own. */
export function ReleasesSection({ data, mode }: { data: Settled<Release[]>; mode: "digest" | "full" }) {
  if (!data.ok) {
    return (
      <PageSection id="ny-musikk" title="Ny musikk" icon="music">
        <ErrorMessage error={data.error}>Kunne ikke hente Spotify</ErrorMessage>
      </PageSection>
    )
  }
  if (data.value.length === 0) {
    if (mode === "digest") return null
    return (
      <PageSection id="ny-musikk" title="Ny musikk" icon="music">
        <EmptyState title={`Ingen nye utgivelser de siste ${NEW_FOR_DAYS} dagene`} description="Fra artistene du følger på Spotify." />
      </PageSection>
    )
  }
  const shown = mode === "digest" ? data.value.slice(0, DIGEST_RELEASES) : data.value
  return (
    <PageSection id="ny-musikk" title="Ny musikk" icon="music" {...(mode === "digest" ? { more: { href: MUSIC_PATH, label: `Se alle ${data.value.length}` } } : {})}>
      <Stack gap="md">
        <PictureRows ratio="square" rows={rows(shown)} />
        <FromSpotify />
      </Stack>
    </PageSection>
  )
}
