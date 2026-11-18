import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows } from "@lmfaole/designsystem/components/rows"
import { Text } from "@lmfaole/designsystem/components/text"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { cookies } from "next/headers"

import { PositionControl } from "../../components/position"
import { hourRows } from "../../components/sections"
import { Shell } from "../../components/shell"
import { dayOf, now } from "../../lib/day"
import { dailyOutlook, weatherIcon } from "../../lib/forecast"
import { dateLine, degrees, number } from "../../lib/format"
import { parsePosition, POSITION_COOKIE } from "../../lib/position"
import { settle } from "../../lib/settle"
import { describeSymbol, getForecast } from "../../lib/yr"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vær · Startside" }

/** The whole forecast: the rest of today by the hour, tomorrow every third hour, and the coming days in a line each. */
export default async function Page() {
  const instant = now()
  const day = dayOf(instant)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  const forecast = await settle(getForecast(position))
  const columns = { name: "Tid og vær", value: "Temperatur, nedbør og vind" }

  return (
    <Shell current="weather" title={forecast.ok ? `Vær i ${forecast.value.place}` : "Vær"} lead="Meldingen fra Yr: i dag, i morgen og de neste dagene." actions={<PositionControl current={position} />}>
      <Stack gap="xl">
      {!forecast.ok ? (
        <ErrorMessage error={forecast.error}>Kunne ikke hente været</ErrorMessage>
      ) : (
        <Stack gap="xl">
          <PageSection id="today" title="Resten av i dag" icon="weather">
            <Rows lead="icon" rows={hourRows(forecast.value, "today", day, instant)} columns={columns} />
          </PageSection>
          <PageSection id="tomorrow" title="I morgen" icon="calendar">
            <Rows lead="icon" rows={hourRows(forecast.value, "tomorrow", day, instant)} columns={columns} />
          </PageSection>
          <PageSection id="outlook" title="Kommende dager" icon="calendar">
            <Rows
              lead="icon"
              rows={dailyOutlook(forecast.value.timeseries, day.date, 5).map((outlook) => ({
                key: outlook.date,
                icon: weatherIcon(outlook.symbol),
                body: (
                  <Text as="span" size="sm">
                    <Text as="span" size="sm" weight="medium">
                      {dateLine.format(new Date(`${outlook.date}T12:00:00Z`))}
                    </Text>{" "}
                    {describeSymbol(outlook.symbol)}
                  </Text>
                ),
                trailing: `${degrees(outlook.min)} / ${degrees(outlook.max)} · ${number.format(outlook.precipitation)} mm`,
              }))}
              columns={{ name: "Dag og vær", value: "Laveste og høyeste temperatur, og nedbør" }}
            />
          </PageSection>
        </Stack>
      )}
      <Text size="xs" tone="muted">
        Værdata fra <ExternalLink href="https://www.yr.no">Yr</ExternalLink> (Meteorologisk institutt).
      </Text>
      </Stack>
    </Shell>
  )
}
