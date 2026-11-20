import { Freshness } from "@lmfaole/designsystem/components/freshness"
import { InstallPrompt } from "@lmfaole/designsystem/components/install-prompt"
import { IntroCallout } from "@lmfaole/designsystem/components/intro-callout"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { SummaryBar } from "@lmfaole/designsystem/components/summary-bar"
import { isSeen } from "@lmfaole/designsystem/lib/onboarding"
import { cookies } from "next/headers"

import { AlertsOwnerOnly, GithubUserForm } from "../components/github-user"
import { PositionControl } from "../components/position"
import { AlertsSection, DiscussionsSection, IssuesSection, PullsSection, WeatherDigest } from "../components/sections"
import { Shell } from "../components/shell"
import { dayOf, now } from "../lib/day"
import { groupDiscussions } from "../lib/discussions"
import { dateLine } from "../lib/format"
import { getCiFailures, getDependabot, getDiscussions, getIssues, getPulls, getReplies, isTokenOwner } from "../lib/github"
import { groupIssues } from "../lib/issues"
import { BASE } from "../lib/links"
import { planFor } from "../lib/plan"
import { parsePosition, POSITION_COOKIE } from "../lib/position"
import { groupPulls } from "../lib/pulls"
import { settle } from "../lib/settle"
import { summaryItems } from "../lib/summary"
import { formState, type SearchParams } from "../lib/username"
import { githubPage, SEEN_PATH, seenNotes } from "../lib/visitor"
import { getForecast } from "../lib/yr"

/** The page renews itself every minute (components/shell.tsx); after three missed renewals it says its data may be old. */
const STALE_AFTER = 180

// Rendered on the server for every request: the page shows what is true now.
export const dynamic = "force-dynamic"

/**
 * The front page is a digest: first the state in counts (each a link to what it counts), then the few things that need you
 * most from each source, each with a way to all of it. What is shown follows the time of day (lib/plan.ts); what is left out
 * is not fetched either. The lists, and a page for each thing, are one level down. GitHub is fetched for the visitor's username
 * (lib/visitor.ts); before there is one, the form asking for it stands where the first GitHub section would be. The alerts are the
 * token owner's only.
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const instant = now()
  const day = dayOf(instant)
  const plan = planFor(day)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  const [{ user, known, params }, seen] = await Promise.all([githubPage(searchParams), seenNotes()])
  const asking = user === null
  const owner = user === null ? false : await isTokenOwner(user).catch(() => false)
  const wants = (id: (typeof plan.sections)[number]) => plan.sections.includes(id)
  const github = (id: (typeof plan.sections)[number]) => user !== null && wants(id)

  const [pulls, issues, discussions, forecast, ci, replies, dependabot] = await Promise.all([
    github("pulls") && user !== null ? settle(getPulls(user, plan.pulls)) : null,
    github("issues") && user !== null ? settle(getIssues(user)) : null,
    github("discussions") && user !== null ? settle(getDiscussions(user)) : null,
    wants("weather") ? settle(getForecast(position)) : null,
    owner && user !== null && wants("alerts") ? settle(getCiFailures(user)) : null,
    owner && user !== null && wants("alerts") ? settle(getReplies(user, instant)) : null,
    owner && user !== null && wants("alerts") ? settle(getDependabot(user)) : null,
  ])
  const isGithub = (id: (typeof plan.sections)[number]) => id !== "weather"
  const formAt = asking ? (plan.sections.find(isGithub) ?? (formState(params, "github").error === undefined ? null : "end")) : null
  const form = <GithubUserForm key="github-user" back="/start" params={params} current={known ?? undefined} />

  const summary = summaryItems(BASE, {
    pulls: pulls?.ok ? groupPulls(pulls.value) : [],
    issues: issues?.ok ? groupIssues(issues.value, instant) : [],
    discussions: discussions?.ok ? groupDiscussions(discussions.value) : [],
    alerts: { ci: ci?.ok ? ci.value.length : 0, replies: replies?.ok ? replies.value.length : 0, dependabot: dependabot?.ok ? dependabot.value.length : 0 },
  })

  return (
    <Shell current="front" title={plan.greeting} lead={<>{dateLine.format(instant)} · <Freshness at={instant.toISOString()} now={instant.toISOString()} staleAfterSeconds={STALE_AFTER} /></>} actions={<PositionControl current={position} />}>
      <Stack gap="xl">
        {formAt === null ? (
          <IntroCallout
            id="intro-front"
            seen={isSeen(seen, "intro-front")}
            title="Det du trenger nå, på én side"
            body="Startsiden samler det som venter på deg på GitHub, været og avgangene i nærheten. Hva som vises, følger tiden på døgnet; hver del har en lenke videre til alt."
            icon="home"
            cookiePath={SEEN_PATH}
          />
        ) : null}
        {user === null ? null : <SummaryBar label="Oversikt" items={summary} />}
        {plan.sections.map((id) => {
          if (id === formAt) return form
          if (user === null && isGithub(id)) return null
          if (id === "alerts" && !owner) return <AlertsOwnerOnly key={id} />
          if (id === "alerts" && ci && replies && dependabot) return <AlertsSection key={id} data={{ ci, replies, dependabot }} mode="digest" instant={instant} />
          if (id === "pulls" && pulls) return <PullsSection key={id} data={pulls} mode="digest" instant={instant} />
          if (id === "issues" && issues) return <IssuesSection key={id} data={issues} mode="digest" instant={instant} />
          if (id === "discussions" && discussions) return <DiscussionsSection key={id} data={discussions} mode="digest" />
          if (id === "weather" && forecast) return <WeatherDigest key={id} data={forecast} window={plan.weatherWindow} day={day} instant={instant} />
          return null
        })}
        {formAt === "end" ? form : null}
        <InstallPrompt appName="Startside" seen={isSeen(seen, "install")} cookiePath={SEEN_PATH} />
      </Stack>
    </Shell>
  )
}
