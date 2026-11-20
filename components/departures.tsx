import { DepartureBoard } from "@lmfaole/designsystem/components/departure-board"
import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid, Stack } from "@lmfaole/designsystem/components/layout"
import { LineBadge } from "@lmfaole/designsystem/components/line-badge"
import { PageSection, SectionGroup, SubSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { Text } from "@lmfaole/designsystem/components/text"
import type { IconName } from "@lmfaole/designsystem/lib/icons"

import { clock } from "../lib/format"
import type { Around } from "../lib/getaround"
import { withBase } from "../lib/links"
import { compare, leaveIn, minutesUntil, nextDepartures, toBoard, walkMinutesOver, type Departure, type Mode, type Option, type Stop } from "../lib/transit"

const MODE_ICON = { walk: "walk", bus: "bus", tram: "tram", metro: "metro", rail: "rail", ferry: "ferry", other: "place" } as const satisfies Record<Mode, IconName>

/** How many a digest shows: the next departures, and the trips compared with walking; the full page shows rows (a line to one destination) per stop. */
const DIGEST = { departures: 4, options: 2 } as const
const FULL = { departures: 5, options: 4 } as const

const when = (time: string, instant: Date): string => {
  const left = minutesUntil(time, instant)
  return left < 1 ? "nå" : left < 20 ? `${left} min` : clock.format(new Date(time))
}

function departureRow(departure: Departure, instant: Date): RowData {
  const leave = leaveIn(departure, instant)
  return {
    key: `${departure.stop}-${departure.line}-${departure.time}`,
    lead: <LineBadge line={departure.line} mode={toBoard(departure).mode} />,
    body: (
      <Stack gap="xs">
        <Text as="span" size="sm" weight="medium">
          {departure.destination}
        </Text>
        <Text size="xs" tone="muted">
          {departure.stop} · {walkMinutesOver(departure.distance)} min å gå · gå om {leave} min
        </Text>
      </Stack>
    ),
    trailing: `${when(departure.time, instant)}${departure.realtime ? "" : " (rutetid)"}`,
  }
}

function optionRow(option: Option): RowData {
  const ride = option.trip.legs.find((leg) => leg.mode !== "walk")
  const verdict = option.saves > 0 ? `${option.saves} min raskere enn å gå` : option.saves < 0 ? `${-option.saves} min tregere enn å gå` : "like fort som å gå"
  return {
    key: option.key,
    icon: MODE_ICON[ride?.mode ?? "other"],
    body: (
      <Stack gap="xs">
        <Text as="span" size="sm" weight="medium">
          {option.name}
        </Text>
        <Text size="xs" tone="muted">
          Gå om {option.leaveIn} min · {verdict}
        </Text>
      </Stack>
    ),
    trailing: `${option.minutes} min · ankomst ${clock.format(new Date(option.trip.end))}`,
  }
}

/**
 * Getting around, for the front page and for its own page: how to get to where the reader is going, public transport set against
 * walking (the reader often walks), and what leaves from the stops around them.
 */
export function DeparturesSection({ data, mode, instant }: { data: Around; mode: "digest" | "full"; instant: Date }) {
  const size = mode === "digest" ? DIGEST : FULL
  const { journey } = data
  const title = journey.to === null ? `Avganger fra ${journey.from.name}` : `Fra ${journey.from.name} til ${journey.to.name}`
  const more = mode === "digest" ? { href: withBase("/avganger"), label: "Se alle avganger" } : undefined

  const trips = data.trips
  const comparison = trips === null ? null : trips.ok ? compare(trips.value.walkSeconds, trips.value.trips, instant, size.options) : null
  const walk: RowData[] =
    comparison?.walkMinutes === null || comparison === null
      ? []
      : [{ key: "walk", icon: "walk", body: <Text as="span" size="sm" weight="medium">Gå hele veien</Text>, trailing: `${comparison.walkMinutes} min` }]

  const next = !data.stops.ok ? (
    <ErrorMessage error={data.stops.error}>Kunne ikke hente avganger fra Entur</ErrorMessage>
  ) : mode === "full" ? <Boards stops={data.stops.value} instant={instant} limit={size.departures} headingLevel={trips === null ? 3 : 4} /> : <Departures stops={data.stops.value} instant={instant} limit={size.departures} />
  if (trips === null) {
    return (
      <PageSection id="departures" title={title} icon="bus" {...(more === undefined ? {} : { more })}>
        {next}
      </PageSection>
    )
  }
  // Two groups with a title each: the way to where the reader is going, and what leaves from the stops around them.
  return (
    <SectionGroup id="departures" title={title} icon="bus" {...(more === undefined ? {} : { more })}>
      <SubSection id="departures-trip" title="Reisetid" icon="walk">
        {comparison === null ? (
          !trips.ok ? <ErrorMessage error={trips.error}>Kunne ikke hente reiseforslag fra Entur</ErrorMessage> : null
        ) : (
          <Stack width="reading">
            <Rows lead="icon" rows={[...walk, ...comparison.options.map(optionRow)]} columns={{ name: "Reisemåte", value: "Tid og ankomst" }} />
          </Stack>
        )}
      </SubSection>
      <SubSection id="departures-next" title={mode === "full" ? "Avganger fra stoppene" : "Neste avganger"} icon="bus">
        {next}
      </SubSection>
    </SectionGroup>
  )
}

function Departures({ stops, instant, limit }: { stops: Stop[]; instant: Date; limit: number }) {
  const departures = nextDepartures(stops, instant, limit)
  if (departures.length === 0) {
    return <EmptyState title="Ingen avganger du rekker" description="Ingenting går de neste halvannen timen som du rekker å gå til." />
  }
  return <Rows lead="poster" rows={departures.map((departure) => departureRow(departure, instant))} columns={{ name: "Avgang", value: "Om" }} />
}

/** The full page: a departure board for each stop around the reader with anything leaving from it, the nearest first. */
function Boards({ stops, instant, limit, headingLevel }: { stops: Stop[]; instant: Date; limit: number; headingLevel: 3 | 4 }) {
  const shown = stops.filter((stop) => stop.departures.length > 0).toSorted((a, b) => a.distance - b.distance)
  if (shown.length === 0) {
    return <EmptyState title="Ingen avganger" description="Ingenting går fra stoppene rundt deg den nærmeste tiden." />
  }
  return (
    <Grid columns="charts">
      {shown.map((stop) => (
        <DepartureBoard key={stop.id} stop={stop.name} now={instant.toISOString()} departures={stop.departures.map((departure) => toBoard(departure))} walkMinutes={walkMinutesOver(stop.distance)} distance={stop.distance} headingLevel={headingLevel} limit={limit} />
      ))}
    </Grid>
  )
}
