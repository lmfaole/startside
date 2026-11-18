import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid, Inline, Stack } from "@lmfaole/designsystem/components/layout"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { PageSection, SectionGroup, SubSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { Text } from "@lmfaole/designsystem/components/text"

import { cookies } from "next/headers"

import { PositionControl } from "../components/position"
import { Refresh } from "../components/refresh"
import { dayOf, now, type Day } from "../lib/day"
import { getIssues, getPulls, type Item } from "../lib/github"
import { ageLabels, statusLabels, type Label } from "../lib/pr-status"
import { groupIssues } from "../lib/issues"
import { groupPulls } from "../lib/pulls"
import { planFor, type Plan, type SectionId } from "../lib/plan"
import { parsePosition, POSITION_COOKIE, type Position } from "../lib/position"
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
      <PageSection id="weather" title={`Vær i ${place} ${window === "today" ? "i dag" : "i morgen"}`}>
        <Rows rows={rows} columns={{ name: "Tid og vær", value: "Temperatur, nedbør og vind" }} />
        <Text size="xs" tone="muted">
          Værdata fra <ExternalLink href="https://www.yr.no">Yr</ExternalLink> (Meteorologisk institutt).
        </Text>
      </PageSection>
    )
  } catch (error) {
    return (
      <PageSection id="weather" title="Vær">
        <ErrorMessage error={asError(error)}>Kunne ikke hente været</ErrorMessage>
      </PageSection>
    )
  }
}

function row(item: Pick<Item, "key" | "href" | "title" | "repo" | "updated">, labels: Label[]): RowData {
  return {
    key: item.key,
    body: (
      <Stack gap="xs">
        <ExternalLink href={item.href}>{item.title}</ExternalLink>
        <Text size="xs" tone="muted">
          {item.repo}
        </Text>
        {labels.length === 0 ? null : (
          <Inline gap="sm">
            {labels.map((label) => (
              <Text key={label.text} as="span" size="xs" tone={label.tone} weight={label.tone === "destructive" ? "medium" : "normal"}>
                {label.text}
              </Text>
            ))}
          </Inline>
        )}
      </Stack>
    ),
    trailing: short.format(new Date(item.updated)),
  }
}

const COLUMNS = { name: "Tittel", value: "Sist oppdatert" } as const

/** Pull requests in sections by what needs you most (lib/pulls.ts): blocked, ready to merge, waiting for your review, and so on. */
async function Pulls({ which, instant }: { which: "all" | "mine"; instant: Date }) {
  try {
    const groups = groupPulls(await getPulls(which))
    if (groups.length === 0) {
      return (
        <PageSection id="pulls" title="Pull requests">
          <Text size="sm" tone="muted">
            Ingen åpne pull requests.
          </Text>
        </PageSection>
      )
    }
    return (
      <SectionGroup id="pulls" title="Pull requests" width="row">
        {groups.map((group) => (
          <SubSection key={group.id} id={`pulls-${group.id}`} title={group.title}>
            <Rows
              rows={group.entries.map(({ item, whose }) => row(item, [...(item.status === undefined ? [] : statusLabels(item.status, whose)), ...ageLabels(item, whose, instant)]))}
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
        <PageSection id="issues" title="Issues">
          <Text size="sm" tone="muted">
            Ingen åpne issues.
          </Text>
        </PageSection>
      )
    }
    return (
      <SectionGroup id="issues" title="Issues" width="row">
        {groups.map((group) => (
          <SubSection key={group.id} id={`issues-${group.id}`} title={group.title}>
            <Rows rows={group.items.map((item) => row(item, []))} columns={COLUMNS} />
          </SubSection>
        ))}
      </SectionGroup>
    )
  } catch (error) {
    return (
      <PageSection id="issues" title="Issues">
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

function Section({ id, plan, day, instant, position }: { id: SectionId; plan: Plan; day: Day; instant: Date; position: Position | null }) {
  if (id === "weather") return <Weather window={plan.weatherWindow} day={day} instant={instant} position={position} />
  return id === "pulls" ? <Pulls which={plan.pulls} instant={instant} /> : <Issues />
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
