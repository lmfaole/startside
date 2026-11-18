import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid, Stack } from "@lmfaole/designsystem/components/layout"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { PageSection, SectionGroup, SubSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { StatusLine } from "@lmfaole/designsystem/components/status-line"
import { Text } from "@lmfaole/designsystem/components/text"
import type { IconName } from "@lmfaole/designsystem/lib/icons"

import { cookies } from "next/headers"

import { PositionControl } from "../components/position"
import { Refresh } from "../components/refresh"
import { dayOf, now, type Day } from "../lib/day"
import { getDiscussions, getIssues, getPulls, type Item } from "../lib/github"
import { ageLabels, statusLabels, type Label } from "../lib/pr-status"
import { groupDiscussions } from "../lib/discussions"
import { groupIssues } from "../lib/issues"
import { groupPulls } from "../lib/pulls"
import { planFor, type Plan, type SectionId } from "../lib/plan"
import { parsePosition, POSITION_COOKIE, type Position } from "../lib/position"
import { weatherIcon } from "../lib/forecast"
import { describeSymbol, getWeather } from "../lib/yr"

// Rendered on the server for every request: the page shows what is true now.
export const dynamic = "force-dynamic"

const TIME_ZONE = "Europe/Oslo"

/** How often the open page asks for itself again (components/refresh.tsx); GitHub is cached for as long, so each ask sees fresh lists. */
const REFRESH_SECONDS = 60
const clock = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
const dateLine = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE })
const short = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: TIME_ZONE })
const number = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 })

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

async function Weather({ window, day, instant, position }: { window: "today" | "tomorrow"; day: Day; instant: Date; position: Position | null }) {
  try {
    const { place, hours } = await getWeather(window, day, instant, position)
    const rows: RowData[] = hours.map((hour) => ({
      key: hour.time,
      icon: weatherIcon(hour.symbol),
      body: (
        <Text as="span" size="sm">
          <Text as="span" size="sm" numeric weight="medium">
            {clock.format(new Date(hour.time))}
          </Text>{" "}
          {describeSymbol(hour.symbol)}
        </Text>
      ),
      trailing: `${Math.round(hour.temperature)}° · ${number.format(hour.precipitation)} mm · ${number.format(hour.wind)} m/s`,
    }))
    return (
      <PageSection id="weather" title={`Vær i ${place} ${window === "today" ? "i dag" : "i morgen"}`} icon="weather">
        <Rows lead="icon" rows={rows} columns={{ name: "Tid og vær", value: "Temperatur, nedbør og vind" }} />
        <Text size="xs" tone="muted">
          Værdata fra <ExternalLink href="https://www.yr.no">Yr</ExternalLink> (Meteorologisk institutt).
        </Text>
      </PageSection>
    )
  } catch (error) {
    return (
      <PageSection id="weather" title="Vær" icon="weather">
        <ErrorMessage error={asError(error)}>Kunne ikke hente været</ErrorMessage>
      </PageSection>
    )
  }
}

/** What a row stands for: its icon, what a screen reader hears for it, and `destructive` where it stops something. */
interface Kind {
  icon: IconName
  label?: string
  tone?: "muted" | "destructive"
}

function row(item: Pick<Item, "key" | "href" | "title" | "repo" | "updated">, labels: Label[], kind: Kind): RowData {
  return {
    key: item.key,
    icon: kind.icon,
    ...(kind.label === undefined ? {} : { iconLabel: kind.label }),
    ...(kind.tone === undefined ? {} : { iconTone: kind.tone }),
    body: (
      <Stack gap="xs">
        <ExternalLink href={item.href}>{item.title}</ExternalLink>
        <Text size="xs" tone="muted">
          {item.repo}
        </Text>
        <StatusLine items={labels} />
      </Stack>
    ),
    trailing: short.format(new Date(item.updated)),
  }
}

const COLUMNS = { name: "Tittel", value: "Sist oppdatert" } as const

/** What each group of pull requests, issues and discussions is, as an icon in front of its title. */
const PULL_ICONS = { blocked: "warning", ready: "merge", review: "view", waiting: "waiting", notReady: "pull-request-draft", drafts: "edit", open: "pull-request" } as const satisfies Record<string, IconName>
const ISSUE_ICONS = { assigned: "tasks", involved: "person", new: "inbox", recent: "time" } as const satisfies Record<string, IconName>
const DISCUSSION_ICONS = { involved: "person", unanswered: "question", recent: "time" } as const satisfies Record<string, IconName>

/** Pull requests in sections by what needs you most (lib/pulls.ts): blocked, ready to merge, waiting for your review, and so on. */
async function Pulls({ which, instant }: { which: "all" | "mine"; instant: Date }) {
  try {
    const groups = groupPulls(await getPulls(which))
    if (groups.length === 0) {
      return (
        <PageSection id="pulls" title="Pull requests" icon="pull-request">
          <Text size="sm" tone="muted">
            Ingen åpne pull requests.
          </Text>
        </PageSection>
      )
    }
    return (
      <SectionGroup id="pulls" title="Pull requests" icon="pull-request" width="row">
        {groups.map((group) => (
          <SubSection key={group.id} id={`pulls-${group.id}`} title={group.title} icon={PULL_ICONS[group.id]}>
            <Rows
              lead="icon"
              rows={group.entries.map(({ item, whose }) =>
                row(item, [...(item.status === undefined ? [] : statusLabels(item.status, whose)), ...ageLabels(item, whose, instant)], {
                  icon: item.status?.draft ? "pull-request-draft" : "pull-request",
                  label: item.status?.draft ? "Utkast" : "Pull request",
                  ...(group.id === "blocked" ? { tone: "destructive" as const } : {}),
                }),
              )}
              columns={COLUMNS}
            />
          </SubSection>
        ))}
      </SectionGroup>
    )
  } catch (error) {
    return (
      <PageSection id="pulls" title="Pull requests">
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

/** Issues in sections by what is for you (lib/issues.ts): assigned to you, ones you are involved in, new ones nobody owns, and what moved lately. */
async function Issues() {
  try {
    const groups = groupIssues(await getIssues(), new Date())
    if (groups.length === 0) {
      return (
        <PageSection id="issues" title="Issues" icon="issue">
          <Text size="sm" tone="muted">
            Ingen åpne issues.
          </Text>
        </PageSection>
      )
    }
    return (
      <SectionGroup id="issues" title="Issues" icon="issue" width="row">
        {groups.map((group) => (
          <SubSection key={group.id} id={`issues-${group.id}`} title={group.title} icon={ISSUE_ICONS[group.id]}>
            <Rows lead="icon" rows={group.items.map((item) => row(item, [], { icon: "issue", label: "Issue" }))} columns={COLUMNS} />
          </SubSection>
        ))}
      </SectionGroup>
    )
  } catch (error) {
    return (
      <PageSection id="issues" title="Issues" icon="issue">
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

/** Discussions in sections (lib/discussions.ts): the ones you are in, and the unanswered ones. Nothing shown where there are none. */
async function Discussions() {
  try {
    const groups = groupDiscussions(await getDiscussions())
    if (groups.length === 0) return null
    return (
      <SectionGroup id="discussions" title="Discussions" icon="discussion" width="row">
        {groups.map((group) => (
          <SubSection key={group.id} id={`discussions-${group.id}`} title={group.title} icon={DISCUSSION_ICONS[group.id]}>
            <Rows
              lead="icon"
              rows={group.items.map((item) =>
                row(item, [...(item.category === "" ? [] : [{ text: item.category, tone: "muted" as const, icon: "tag" as const }]), { text: item.comments === 1 ? "1 svar" : `${item.comments} svar`, tone: "muted" as const, icon: "discussion" as const }], {
                  icon: item.answered === false ? "question" : "discussion",
                  label: item.answered === false ? "Spørsmål" : "Discussion",
                }),
              )}
              columns={COLUMNS}
            />
          </SubSection>
        ))}
      </SectionGroup>
    )
  } catch (error) {
    return (
      <PageSection id="discussions" title="Discussions" icon="discussion">
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

function Section({ id, plan, day, instant, position }: { id: SectionId; plan: Plan; day: Day; instant: Date; position: Position | null }) {
  if (id === "weather") return <Weather window={plan.weatherWindow} day={day} instant={instant} position={position} />
  if (id === "pulls") return <Pulls which={plan.pulls} instant={instant} />
  return id === "issues" ? <Issues /> : <Discussions />
}

export default async function Page() {
  // What the page shows follows the time of day (lib/plan.ts); what is left out is not fetched either.
  const instant = now()
  const day = dayOf(instant)
  const plan = planFor(day)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  return (
    <PageLayout>
      <Refresh everySeconds={REFRESH_SECONDS} />
      <PageHeader title={plan.greeting} lead={`${dateLine.format(instant)} · oppdatert ${clock.format(instant)}`} actions={<PositionControl current={position} />} />
      <Grid columns="sections" gap="xl">
        {plan.sections.map((id) => (
          <Section key={id} id={id} plan={plan} day={day} instant={instant} position={position} />
        ))}
      </Grid>
    </PageLayout>
  )
}
