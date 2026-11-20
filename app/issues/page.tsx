import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"

import { IssuesSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getIssues } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Issues · Startside" }

/** The issues, asked for while the page is sent: the frame and the way back are there at once. */
async function Issues() {
  const instant = now()
  return <IssuesSection data={await settle(getIssues())} mode="full" instant={instant} />
}

/** The issues that are for you, in groups: assigned to you, ones you are involved in, new ones nobody owns, and what moved lately. */
export default function Page() {
  return (
    <Shell current="github" trail={[GITHUB]} title="Issues" lead="Det som er tildelt deg, det du er med i, det nye som ingen eier, og det som har rørt seg.">
      <StreamedSection title="issues" lines={4}>
        <Issues />
      </StreamedSection>
    </Shell>
  )
}
