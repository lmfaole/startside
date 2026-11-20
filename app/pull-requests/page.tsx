import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"

import { PullsSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getPulls } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Pull requests · Startside" }

/** The pull requests, asked for while the page is sent: the frame and the way back are there at once. */
async function Pulls() {
  const instant = now()
  return <PullsSection data={await settle(getPulls("all"))} mode="full" instant={instant} />
}

/** Every pull request, in groups by what needs you most: blocked, ready to merge, waiting for your review, and the rest. */
export default function Page() {
  return (
    <Shell current="github" trail={[GITHUB]} title="Pull requests" lead="Dine egne og de som venter på din review, med det som krever deg først.">
      <StreamedSection title="pull requests" lines={4}>
        <Pulls />
      </StreamedSection>
    </Shell>
  )
}
