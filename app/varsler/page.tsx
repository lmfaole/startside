import { Stack } from "@lmfaole/designsystem/components/layout"
import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"

import { AiSummary } from "../../components/ai-summary"
import { AlertsSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { replyText } from "../../lib/alerts"
import { now } from "../../lib/day"
import { getCiFailures, getDependabot, getReplies } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Varsler · Startside" }

/** The alerts, asked for while the page is sent: the frame and the way back are there at once. The summary is asked for after them, so it never holds them back. */
async function Alerts() {
  const instant = now()
  const [ci, replies, dependabot] = await Promise.all([settle(getCiFailures()), settle(getReplies(instant)), settle(getDependabot())])
  const lines = [
    ...(ci.ok ? ci.value.map((failure) => `${failure.repo}: CI feilet på ${failure.branch} (${failure.headline})`) : []),
    ...(replies.ok ? replies.value.map((reply) => `${reply.repo}: ${reply.who} ${replyText(reply.what)} på «${reply.title}»`) : []),
    ...(dependabot.ok ? dependabot.value.map((item) => `${item.repo}: Dependabot: ${item.title}`) : []),
  ]
  return (
    <Stack gap="xl">
      {lines.length === 0 ? null : <AiSummary kind="varsler" input={{ title: "Varsler", lines }} />}
      <AlertsSection data={{ ci, replies, dependabot }} mode="full" instant={instant} />
    </Stack>
  )
}

/** What wants a look: repositories whose default branch is red, replies and reviews from others on what you are in, and Dependabot's open pull requests. */
export default function Page() {
  return (
    <Shell current="github" trail={[GITHUB]} title="Varsler" lead="Det som er rødt, det som er nytt fra andre, og det Dependabot venter på.">
      <StreamedSection title="varsler" lines={4}>
        <Alerts />
      </StreamedSection>
    </Shell>
  )
}
