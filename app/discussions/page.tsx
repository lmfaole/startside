import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"

import { DiscussionsSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { getDiscussions } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Discussions · Startside" }

/** The discussions, asked for while the page is sent: the frame and the way back are there at once. */
async function Discussions() {
  return <DiscussionsSection data={await settle(getDiscussions())} mode="full" />
}

/** The discussions of the watched repositories, in groups: the ones you are in, the unanswered questions, and what moved lately. */
export default function Page() {
  return (
    <Shell current="github" trail={[GITHUB]} title="Discussions" lead="Samtalene du er med i, spørsmål uten svar, og det som har rørt seg.">
      <StreamedSection title="discussions" lines={4}>
        <Discussions />
      </StreamedSection>
    </Shell>
  )
}
