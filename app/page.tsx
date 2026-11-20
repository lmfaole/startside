import { Freshness } from "@lmfaole/designsystem/components/freshness"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { SummaryBar } from "@lmfaole/designsystem/components/summary-bar"
import { cookies } from "next/headers"

import { NowPlayingSection, ReleasesSection } from "../components/music"
import { PositionControl } from "../components/position"
import { AlertsSection, DiscussionsSection, IssuesSection, PullsSection, WeatherDigest } from "../components/sections"
import { Shell } from "../components/shell"
import { dayOf, now } from "../lib/day"
import { groupDiscussions } from "../lib/discussions"
import { dateLine } from "../lib/format"
import { getCiFailures, getDependabot, getDiscussions, getIssues, getPulls, getReplies } from "../lib/github"
import { groupIssues } from "../lib/issues"
import { BASE } from "../lib/links"
import { planFor } from "../lib/plan"
import { parsePosition, POSITION_COOKIE } from "../lib/position"
import { groupPulls } from "../lib/pulls"
import { settle } from "../lib/settle"
import { summaryItems } from "../lib/summary"
import { getNowPlaying, getReleases } from "../lib/spotify-source"
import { getForecast } from "../lib/yr"

/** The page renews itself every minute (components/shell.tsx); after three missed renewals it says its data may be old. */
const STALE_AFTER = 180

// Rendered on the server for every request: the page shows what is true now.
export const dynamic = "force-dynamic"

/**
 * The front page is a digest: first the state in counts (each a link to what it counts), then the few things that need you
 * most from each source, each with a way to all of it. What is shown follows the time of day (lib/plan.ts); what is left out
 * is not fetched either. The lists, and a page for each thing, are one level down.
 */
export default async function Page() {
  const instant = now()
  const day = dayOf(instant)
  const plan = planFor(day)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  const wants = (id: (typeof plan.sections)[number]) => plan.sections.includes(id)

  const [pulls, issues, discussions, forecast, ci, replies, dependabot, releases, nowPlaying] = await Promise.all([
    wants("pulls") ? settle(getPulls(plan.pulls)) : null,
    wants("issues") ? settle(getIssues()) : null,
    wants("discussions") ? settle(getDiscussions()) : null,
    wants("weather") ? settle(getForecast(position)) : null,
    wants("alerts") ? settle(getCiFailures()) : null,
    wants("alerts") ? settle(getReplies(instant)) : null,
    wants("alerts") ? settle(getDependabot()) : null,
    wants("music") ? settle(getReleases(instant)) : null,
    // What plays this second: shown whatever the time of day, and nothing where nothing plays or Spotify is not set up.
    getNowPlaying().catch(() => null),
  ])

  const summary = summaryItems(BASE, {
    pulls: pulls?.ok ? groupPulls(pulls.value) : [],
    issues: issues?.ok ? groupIssues(issues.value, instant) : [],
    discussions: discussions?.ok ? groupDiscussions(discussions.value) : [],
    alerts: { ci: ci?.ok ? ci.value.length : 0, replies: replies?.ok ? replies.value.length : 0, dependabot: dependabot?.ok ? dependabot.value.length : 0 },
  })

  return (
    <Shell current="front" title={plan.greeting} lead={<>{dateLine.format(instant)} · <Freshness at={instant.toISOString()} now={instant.toISOString()} staleAfterSeconds={STALE_AFTER} /></>} actions={<PositionControl current={position} />}>
      <Stack gap="xl">
        <NowPlayingSection now={nowPlaying} />
        <SummaryBar label="Oversikt" items={summary} />
        {plan.sections.map((id) => {
          if (id === "alerts" && ci && replies && dependabot) return <AlertsSection key={id} data={{ ci, replies, dependabot }} mode="digest" instant={instant} />
          if (id === "pulls" && pulls) return <PullsSection key={id} data={pulls} mode="digest" instant={instant} />
          if (id === "issues" && issues) return <IssuesSection key={id} data={issues} mode="digest" instant={instant} />
          if (id === "discussions" && discussions) return <DiscussionsSection key={id} data={discussions} mode="digest" />
          if (id === "music" && releases) return <ReleasesSection key={id} data={releases} mode="digest" />
          if (id === "weather" && forecast) return <WeatherDigest key={id} data={forecast} window={plan.weatherWindow} day={day} instant={instant} />
          return null
        })}
      </Stack>
    </Shell>
  )
}
