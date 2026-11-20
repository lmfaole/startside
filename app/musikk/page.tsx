import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"

import { ReleasesSection } from "../../components/music"
import { Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { settle } from "../../lib/settle"
import { getReleases } from "../../lib/spotify-source"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ny musikk · Startside" }

/** The releases, asked for while the page is sent: the frame and the way back are there at once. */
async function Releases() {
  return <ReleasesSection data={await settle(getReleases(now()))} mode="full" />
}

/** New albums and singles by the artists you follow on Spotify, the newest first. */
export default function Page() {
  return (
    <Shell current="front" trail={[]} title="Ny musikk" lead="Nye album og singler fra artistene du følger.">
      <StreamedSection title="ny musikk" lines={4}>
        <Releases />
      </StreamedSection>
    </Shell>
  )
}
