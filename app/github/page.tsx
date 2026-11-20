import { Stack } from "@lmfaole/designsystem/components/layout"
import { StreamedSection } from "@lmfaole/designsystem/components/streamed-section"
import { SubPages } from "@lmfaole/designsystem/components/sub-pages"
import { SummaryBar } from "@lmfaole/designsystem/components/summary-bar"

import { GITHUB, Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { groupDiscussions } from "../../lib/discussions"
import { getCiFailures, getDependabot, getDiscussions, getIssues, getPulls, getReplies } from "../../lib/github"
import { groupIssues } from "../../lib/issues"
import { BASE, withBase } from "../../lib/links"
import { groupPulls } from "../../lib/pulls"
import { settle } from "../../lib/settle"
import { summaryItems } from "../../lib/summary"

export const dynamic = "force-dynamic"
export const metadata = { title: "GitHub · Startside" }

/** The counts of what wants you: asked for while the rest of the page is sent, so the pages under GitHub are there at once and the slowest source holds nothing back. */
async function Counts() {
  const instant = now()
  const [pulls, issues, discussions, ci, replies, dependabot] = await Promise.all([settle(getPulls("all")), settle(getIssues()), settle(getDiscussions()), settle(getCiFailures()), settle(getReplies(instant)), settle(getDependabot())])
  const summary = summaryItems(BASE, {
    pulls: pulls.ok ? groupPulls(pulls.value) : [],
    issues: issues.ok ? groupIssues(issues.value, instant) : [],
    discussions: discussions.ok ? groupDiscussions(discussions.value) : [],
    alerts: { ci: ci.ok ? ci.value.length : 0, replies: replies.ok ? replies.value.length : 0, dependabot: dependabot.ok ? dependabot.value.length : 0 },
  })
  return <SummaryBar label="Oversikt" items={summary} />
}

/** GitHub in one place: the counts of what wants you, and the pages under it. */
export default function Page() {
  return (
    <Shell current="github" title={GITHUB.label} lead="Det som venter på deg i repoene dine.">
      <Stack gap="xl">
        <StreamedSection title="oversikten" lines={1}>
          <Counts />
        </StreamedSection>
        <SubPages
          label="Under GitHub"
          pages={[
            { href: withBase("/varsler"), label: "Varsler", icon: "notification", description: "Feilende CI, nytt fra andre og Dependabot." },
            { href: withBase("/pull-requests"), label: "Pull requests", icon: "pull-request", description: "Dine egne og de som venter på din review." },
            { href: withBase("/issues"), label: "Issues", icon: "issue", description: "Det som er tildelt deg, nytt uten eier og det som har rørt seg." },
            { href: withBase("/discussions"), label: "Discussions", icon: "discussion", description: "Samtalene du er med i og spørsmål uten svar." },
          ]}
        />
      </Stack>
    </Shell>
  )
}
