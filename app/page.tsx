import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid, Inline, Stack } from "@lmfaole/designsystem/components/layout"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { Text } from "@lmfaole/designsystem/components/text"

import { cookies } from "next/headers"

import { PositionControl } from "../components/position"
import { dayOf, now, type Day } from "../lib/day"
import { getIssues, getMine, getReviews, type Item } from "../lib/github"
import { statusLabels } from "../lib/pr-status"
import { planFor, type SectionId } from "../lib/plan"
import { parsePosition, POSITION_COOKIE, type Position } from "../lib/position"
import { describeSymbol, getWeather } from "../lib/yr"

// Rendered on the server for every request: the page shows what is true now.
export const dynamic = "force-dynamic"

const TIME_ZONE = "Europe/Oslo"
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

function itemRows(items: Item[], whose: "mine" | "theirs"): RowData[] {
  return items.map((item) => ({
    key: item.key,
    body: (
      <Stack gap="xs">
        <ExternalLink href={item.href}>{item.title}</ExternalLink>
        <Text size="xs" tone="muted">
          {item.repo}
        </Text>
        {item.status === undefined ? null : (
          <Inline gap="sm">
            {statusLabels(item.status, whose).map((label) => (
              <Text key={label.text} as="span" size="xs" tone={label.tone} weight={label.tone === "destructive" ? "medium" : "normal"}>
                {label.text}
              </Text>
            ))}
          </Inline>
        )}
      </Stack>
    ),
    trailing: short.format(new Date(item.updated)),
  }))
}

const LISTS = {
  reviews: { title: "Venter på din review", empty: "Ingen å se på.", load: getReviews },
  mine: { title: "Dine åpne pull requests", empty: "Ingen åpne.", load: getMine },
  issues: { title: "Tildelt deg", empty: "Ingen saker.", load: getIssues },
} as const

async function GithubList({ id }: { id: keyof typeof LISTS }) {
  const list = LISTS[id]
  try {
    const items = await list.load()
    return (
      <PageSection id={id} title={list.title}>
        {items.length === 0 ? (
          <Text size="sm" tone="muted">
            {list.empty}
          </Text>
        ) : (
          <Rows rows={itemRows(items, id === "reviews" ? "theirs" : "mine")} columns={{ name: "Tittel", value: "Sist oppdatert" }} />
        )}
      </PageSection>
    )
  } catch (error) {
    return (
      <PageSection id={id} title={list.title}>
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

function Section({ id, window, day, instant, position }: { id: SectionId; window: "today" | "tomorrow"; day: Day; instant: Date; position: Position | null }) {
  return id === "weather" ? <Weather window={window} day={day} instant={instant} position={position} /> : <GithubList id={id} />
}

export default async function Page() {
  // What the page shows follows the time of day (lib/plan.ts); what is left out is not fetched either.
  const instant = now()
  const day = dayOf(instant)
  const plan = planFor(day)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  return (
    <PageLayout>
      <PageHeader title={plan.greeting} lead={dateLine.format(instant)} actions={<PositionControl current={position} />} />
      <Grid columns="sections" gap="xl">
        {plan.sections.map((id) => (
          <Section key={id} id={id} window={plan.weatherWindow} day={day} instant={instant} position={position} />
        ))}
      </Grid>
    </PageLayout>
  )
}
