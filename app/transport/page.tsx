import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { Freshness } from "@lmfaole/designsystem/components/freshness"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Text } from "@lmfaole/designsystem/components/text"
import { cookies } from "next/headers"

import { NearbyStops } from "../../components/nearby-stops"
import { PositionControl } from "../../components/position"
import { Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getStops } from "../../lib/entur"
import { parsePosition, POSITION_COOKIE } from "../../lib/position"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Transport · Startside" }

/** The page renews itself every minute (components/shell.tsx): after three missed renewals the departures may have changed. */
const STALE_AFTER = 180

/** How far from the device the stations are looked for, in metres. */
const RADIUS = 1000

/** The stations nearest to where the device is and what leaves from them; without the device's position there is nothing to show. */
export default async function Page() {
  const instant = now()
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  const stops = position === null ? null : await settle(getStops(position, RADIUS))

  return (
    <Shell current="transport" width="wide" title="Transport" lead={<>Nærmeste stasjoner og avganger fra der du er · <Freshness at={instant.toISOString()} now={instant.toISOString()} staleAfterSeconds={STALE_AFTER} /></>} actions={<PositionControl current={position} />}>
      <Stack gap="xl">
        {stops === null ? (
          <PageSection id="stations" title="Nærmeste stasjoner" icon="bus">
            <EmptyState title="Vi vet ikke hvor du er" description="Trykk «Bruk min posisjon» for å se stasjonene nærmest deg og avgangene derfra." icon="place" />
          </PageSection>
        ) : (
          <NearbyStops stops={stops} instant={instant} />
        )}
        <Text size="xs" tone="muted">
          Avganger fra <ExternalLink href="https://entur.no">Entur</ExternalLink>.
        </Text>
      </Stack>
    </Shell>
  )
}
