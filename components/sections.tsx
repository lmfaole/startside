import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection, SectionGroup, SubSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { StatusLine } from "@lmfaole/designsystem/components/status-line"
import { Text, TextLink } from "@lmfaole/designsystem/components/text"
import type { IconName } from "@lmfaole/designsystem/lib/icons"

import { groupDiscussions, type DiscussionGroupId } from "../lib/discussions"
import { takeFirst } from "../lib/digest"
import { clock, degrees, number, short } from "../lib/format"
import { hoursOf, type Forecast } from "../lib/yr"
import { weatherIcon } from "../lib/forecast"
import type { Item } from "../lib/github"
import { groupIssues, type IssueGroupId } from "../lib/issues"
import { internalHref, withBase } from "../lib/links"
import { ageLabels, compactLabels, statusLabels, type Label } from "../lib/pr-status"
import { groupPulls, type GroupId } from "../lib/pulls"
import type { Settled } from "../lib/settle"
import type { Day } from "../lib/day"
import { describeSymbol } from "../lib/yr"
import type { DiscussionItem } from "../lib/discussions"

/** How many a section of the front page shows: the digest of a longer list, which has a page of its own. */
export const DIGEST = { pulls: 3, issues: 3, discussions: 3, weather: 4 } as const

/** A row in the digest is compact: no repository line and at most two statuses; the whole of it is on the page of the thing. */
const COMPACT_LABELS = 2

/** What each group of pull requests, issues and discussions is, as an icon in front of its title. */
const PULL_ICONS = { blocked: "warning", ready: "merge", review: "view", waiting: "waiting", notReady: "pull-request-draft", drafts: "edit", open: "pull-request" } as const satisfies Record<GroupId, IconName>
const ISSUE_ICONS = { assigned: "tasks", involved: "person", new: "inbox", recent: "time" } as const satisfies Record<IssueGroupId, IconName>
const DISCUSSION_ICONS = { involved: "person", unanswered: "question", recent: "time" } as const satisfies Record<DiscussionGroupId, IconName>

const COLUMNS = { name: "Tittel", value: "Sist oppdatert" } as const

/** What a row stands for: its icon, what a screen reader hears for it, and `destructive` where it stops something. */
interface Kind {
  icon: IconName
  label?: string
  tone?: "muted" | "destructive"
}

/** A row of a list: the name links to the app's own page for it (never straight out to GitHub), where the way out is the last action. */
function row(item: Pick<Item, "key" | "href" | "title" | "repo" | "updated">, labels: Label[], kind: Kind, compact = false): RowData {
  const own = internalHref(item.href)
  return {
    key: item.key,
    icon: kind.icon,
    ...(kind.label === undefined ? {} : { iconLabel: kind.label }),
    ...(kind.tone === undefined ? {} : { iconTone: kind.tone }),
    body: (
      <Stack gap="xs">
        {own === null ? <ExternalLink href={item.href}>{item.title}</ExternalLink> : <TextLink href={own}>{item.title}</TextLink>}
        {compact ? null : (
          <Text size="xs" tone="muted">
            {item.repo}
          </Text>
        )}
        <StatusLine items={compact ? compactLabels(labels, COMPACT_LABELS) : labels} />
      </Stack>
    ),
    trailing: short.format(new Date(item.updated)),
  }
}

function Failed({ id, title, icon, error }: { id: string; title: string; icon: IconName; error: Error }) {
  return (
    <PageSection id={id} title={title} icon={icon}>
      <ErrorMessage error={error}>Kunne ikke hente GitHub</ErrorMessage>
    </PageSection>
  )
}

function Quiet({ id, title, icon, children }: { id: string; title: string; icon: IconName; children: string }) {
  return (
    <PageSection id={id} title={title} icon={icon}>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </PageSection>
  )
}

const PULLS_PATH = withBase("/pull-requests")
const ISSUES_PATH = withBase("/issues")
const DISCUSSIONS_PATH = withBase("/discussions")

export type PullsData = { reviews: Item[]; mine: Item[] }

type PullEntry = ReturnType<typeof groupPulls>[number]["entries"][number]

const pullRow = ({ item, whose }: PullEntry, group: GroupId, instant: Date, compact = false): RowData =>
  row(
    item,
    [...(item.status === undefined ? [] : statusLabels(item.status, whose)), ...ageLabels(item, whose, instant)],
    { icon: item.status?.draft ? "pull-request-draft" : "pull-request", label: item.status?.draft ? "Utkast" : "Pull request", ...(group === "blocked" ? { tone: "destructive" as const } : {}) },
    compact,
  )

/** Pull requests: on the front page the few that need you most, with a way to all of them; on their own page all of them, in groups by what needs you most. */
export function PullsSection({ data, mode, instant }: { data: Settled<PullsData>; mode: "digest" | "full"; instant: Date }) {
  if (!data.ok) return <Failed id="pulls" title="Pull requests" icon="pull-request" error={data.error} />
  const groups = groupPulls(data.value)
  if (groups.length === 0) return <Quiet id="pulls" title="Pull requests" icon="pull-request">Ingen åpne pull requests.</Quiet>
  if (mode === "full") {
    return (
      <SectionGroup id="pulls" title="Pull requests" icon="pull-request">
        {groups.map((group) => (
          <SubSection key={group.id} id={`pulls-${group.id}`} title={group.title} icon={PULL_ICONS[group.id]}>
            <Rows lead="icon" rows={group.entries.map((entry) => pullRow(entry, group.id, instant))} columns={COLUMNS} />
          </SubSection>
        ))}
      </SectionGroup>
    )
  }
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const first = takeFirst(groups.map((group) => group.entries.map((entry) => ({ entry, group: group.id }))), DIGEST.pulls)
  return (
    <PageSection id="pulls" title="Krever deg" icon="pull-request" more={{ href: PULLS_PATH, label: `Se alle ${total}` }}>
      <Rows lead="icon" rows={first.map(({ entry, group }) => pullRow(entry, group, instant, true))} columns={COLUMNS} />
    </PageSection>
  )
}

export type IssuesData = Parameters<typeof groupIssues>[0]

/** Issues: the few that are for you on the front page; all of them, in groups, on their own page. */
export function IssuesSection({ data, mode, instant }: { data: Settled<IssuesData>; mode: "digest" | "full"; instant: Date }) {
  if (!data.ok) return <Failed id="issues" title="Issues" icon="issue" error={data.error} />
  const groups = groupIssues(data.value, instant)
  if (groups.length === 0) return <Quiet id="issues" title="Issues" icon="issue">Ingen åpne issues.</Quiet>
  const issueRow = (item: Item, compact = false) => row(item, [], { icon: "issue", label: "Issue" }, compact)
  if (mode === "full") {
    return (
      <SectionGroup id="issues" title="Issues" icon="issue">
        {groups.map((group) => (
          <SubSection key={group.id} id={`issues-${group.id}`} title={group.title} icon={ISSUE_ICONS[group.id]}>
            <Rows lead="icon" rows={group.items.map((item) => issueRow(item))} columns={COLUMNS} />
          </SubSection>
        ))}
      </SectionGroup>
    )
  }
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  return (
    <PageSection id="issues" title="Issues til deg" icon="issue" more={{ href: ISSUES_PATH, label: `Se alle ${total}` }}>
      <Rows lead="icon" rows={takeFirst(groups.map((group) => group.items), DIGEST.issues).map((item) => issueRow(item, true))} columns={COLUMNS} />
    </PageSection>
  )
}

export type DiscussionsData = Parameters<typeof groupDiscussions>[0]

const discussionRow = (item: DiscussionItem, compact = false): RowData =>
  row(
    item,
    [...(item.category === "" ? [] : [{ text: item.category, tone: "muted" as const, icon: "tag" as const }]), { text: item.comments === 1 ? "1 svar" : `${item.comments} svar`, tone: "muted" as const, icon: "discussion" as const }],
    { icon: item.answered === false ? "question" : "discussion", label: item.answered === false ? "Spørsmål" : "Discussion" },
    compact,
  )

/** Discussions: the few on the front page; all of them, in groups, on their own page. Nothing where there are none. */
export function DiscussionsSection({ data, mode }: { data: Settled<DiscussionsData>; mode: "digest" | "full" }) {
  if (!data.ok) return <Failed id="discussions" title="Discussions" icon="discussion" error={data.error} />
  const groups = groupDiscussions(data.value)
  if (groups.length === 0) return mode === "full" ? <Quiet id="discussions" title="Discussions" icon="discussion">Ingen discussions.</Quiet> : null
  if (mode === "full") {
    return (
      <SectionGroup id="discussions" title="Discussions" icon="discussion">
        {groups.map((group) => (
          <SubSection key={group.id} id={`discussions-${group.id}`} title={group.title} icon={DISCUSSION_ICONS[group.id]}>
            <Rows lead="icon" rows={group.items.map((item) => discussionRow(item))} columns={COLUMNS} />
          </SubSection>
        ))}
      </SectionGroup>
    )
  }
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  return (
    <PageSection id="discussions" title="Discussions" icon="discussion" more={{ href: DISCUSSIONS_PATH, label: `Se alle ${total}` }}>
      <Rows lead="icon" rows={takeFirst(groups.map((group) => group.items), DIGEST.discussions).map((item) => discussionRow(item, true))} columns={COLUMNS} />
    </PageSection>
  )
}

/** The hours of the weather as rows: a symbol, the time and what it is, and the figures. */
export function hourRows(forecast: Forecast, window: "today" | "tomorrow", day: Day, instant: Date, limit?: number): RowData[] {
  const hours = hoursOf(forecast, window, day, instant)
  return (limit === undefined ? hours : hours.slice(0, limit)).map((hour) => ({
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
    trailing: `${degrees(hour.temperature)} · ${number.format(hour.precipitation)} mm · ${number.format(hour.wind)} m/s`,
  }))
}

/** The weather on the front page: the next few hours, with a way to the whole forecast. */
export function WeatherDigest({ data, window, day, instant }: { data: Settled<Forecast>; window: "today" | "tomorrow"; day: Day; instant: Date }) {
  if (!data.ok) return <Failed id="weather" title="Vær" icon="weather" error={data.error} />
  return (
    <PageSection id="weather" title={`Vær i ${data.value.place} ${window === "today" ? "nå" : "i morgen"}`} icon="weather" more={{ href: withBase("/vaer"), label: "Se hele meldingen" }}>
      <Rows lead="icon" rows={hourRows(data.value, window, day, instant, DIGEST.weather)} columns={{ name: "Tid og vær", value: "Temperatur, nedbør og vind" }} />
    </PageSection>
  )
}
