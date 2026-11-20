import { Banner } from "@lmfaole/designsystem/components/banner"
import { Freshness } from "@lmfaole/designsystem/components/freshness"
import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Text } from "@lmfaole/designsystem/components/text"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"

import { DeparturesSection } from "../../components/departures"
import { HomeControl } from "../../components/home"
import { PositionControl } from "../../components/position"
import { Shell } from "../../components/shell"
import { HOME_COOKIE } from "../../lib/places"
import { cookies } from "next/headers"
import { getContext } from "../../lib/context"
import { dayOf, now } from "../../lib/day"
import { getAround } from "../../lib/getaround"
import { journeyFor } from "../../lib/places"

export const dynamic = "force-dynamic"
export const metadata = { title: "Avganger · Startside" }

/** The page renews itself every minute (components/shell.tsx): after three missed renewals the departures may have changed. */
const STALE_AFTER = 180

/** Getting around: the way to where the reader is going compared with walking, and the next departures from the stops around them. */
export default async function Page() {
  const instant = now()
  const { position, home, work } = await getContext()
  const journey = journeyFor({ position, work, home, day: dayOf(instant) })
  const around = journey === null ? null : await getAround(journey)

  return (
    <Shell current="departures" width="wide" title="Avganger" lead={<>Buss, trikk, T-bane, tog og båt fra der du er, mot gange · <Freshness at={instant.toISOString()} now={instant.toISOString()} staleAfterSeconds={STALE_AFTER} /></>} actions={<Stack gap="sm"><PositionControl current={position} /><HomeControl isSet={(await cookies()).has(HOME_COOKIE)} /></Stack>}>
      <Stack gap="xl">
        {around === null ? (
          <PageSection id="departures" title="Avganger" icon="bus">
            <EmptyState title="Vi vet ikke hvor du er" description="Trykk «Her er hjemme» når du er hjemme, eller bruk posisjonen din, for å se avganger." icon="place" />
          </PageSection>
        ) : (
          <DeparturesSection data={around} mode="full" instant={instant} />
        )}
        {home === null && around !== null ? (
          <Banner title="Hjemstedet er ikke satt">Reiseforslag vises bare når du er et annet sted enn jobb.</Banner>
        ) : null}
        <Text size="xs" tone="muted">
          Avganger og reiseforslag fra <ExternalLink href="https://entur.no">Entur</ExternalLink>.
        </Text>
      </Stack>
    </Shell>
  )
}
