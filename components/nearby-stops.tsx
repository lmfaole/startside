import { DepartureBoard } from "@lmfaole/designsystem/components/departure-board"
import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"

import type { Settled } from "../lib/settle"
import { toBoard, walkMinutesOver, type Stop } from "../lib/transit"

/** Rows (a line to one destination) on each stop's board. */
const LIMIT = 5

/** The stations nearest to the device, each with a departure board of what leaves from it, the nearest first. */
export function NearbyStops({ stops, instant }: { stops: Settled<Stop[]>; instant: Date }) {
  return (
    <PageSection id="stations" title="Nærmeste stasjoner" icon="bus">
      {!stops.ok ? <ErrorMessage error={stops.error}>Kunne ikke hente avganger fra Entur</ErrorMessage> : <Boards stops={stops.value} instant={instant} />}
    </PageSection>
  )
}

function Boards({ stops, instant }: { stops: Stop[]; instant: Date }) {
  const shown = stops.filter((stop) => stop.departures.length > 0).toSorted((a, b) => a.distance - b.distance)
  if (shown.length === 0) {
    return <EmptyState title="Ingen avganger" description="Ingenting går fra stasjonene innen en kilometer fra deg den nærmeste tiden. Om natten kan det være stille en stund; reiseplanleggeren finner turer fra lenger unna." icon="bus" action={{ href: "https://entur.no", label: "Planlegg reisen hos Entur" }} />
  }
  return (
    <Grid columns="charts">
      {shown.map((stop) => (
        <DepartureBoard key={stop.id} stop={stop.name} now={instant.toISOString()} departures={stop.departures.map((departure) => toBoard(departure))} walkMinutes={walkMinutesOver(stop.distance)} distance={stop.distance} headingLevel={3} limit={LIMIT} />
      ))}
    </Grid>
  )
}
