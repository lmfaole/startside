import { EmptyState } from "@lmfaole/designsystem/components/empty-state"
import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows } from "@lmfaole/designsystem/components/rows"
import { Heading, Text } from "@lmfaole/designsystem/components/text"
import { WeatherStage } from "@lmfaole/designsystem/components/weather-stage"
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
  const columns = { name: "Tid og vær", value: "Temperatur" }

  const current = forecast.ok ? forecast.value.timeseries[0] : undefined
  const symbol = current?.data.next_1_hours?.summary.symbol_code ?? current?.data.next_6_hours?.summary.symbol_code
  const today = forecast.ok ? hourRows(forecast.value, "today", day, instant) : []

  return (
    <WeatherStage symbol={symbol ?? "cloudy"} page>
    <Shell current="weather" title={forecast.ok ? `Vær i ${forecast.value.place}` : "Vær"} lead="Meldingen fra Yr: i dag, i morgen og de neste dagene." actions={<PositionControl current={position} />}>
      <Stack gap="xl">
        {!forecast.ok ? (
          <ErrorMessage error={forecast.error}>Kunne ikke hente været</ErrorMessage>
        ) : (
          <>
          {current && symbol ? (
            <WeatherStage symbol={symbol}>
              <Stack gap="xs">
                <Text size="sm" weight="medium">
                  {forecast.value.place} · nå
                </Text>
                <Heading level={2}>{degrees(current.data.instant.details.air_temperature)}</Heading>
                <Text size="sm">
                  {describeSymbol(symbol)}, vind {number.format(current.data.instant.details.wind_speed)} m/s
                </Text>
              </Stack>
            </WeatherStage>
          ) : null}
          <PageSection id="today" title="Resten av i dag" icon="weather">
            {today.length === 0 ? <EmptyState title="Ingen flere timer i dag" /> : <Rows lead="icon" rows={today} columns={columns} />}
          </PageSection>
          <PageSection id="tomorrow" title="I morgen" icon="time">
            <Rows lead="icon" rows={hourRows(forecast.value, "tomorrow", day, instant)} columns={columns} />
          </PageSection>
          <PageSection id="outlook" title="Kommende dager" icon="calendar">
            <Rows
              lead="icon"
              rows={dailyOutlook(forecast.value.timeseries, day.date, 5).map((outlook) => ({
                key: outlook.date,
                icon: weatherIcon(outlook.symbol),
                body: (
                  <Stack gap="xs">
                    <Text as="span" size="sm">
                      <Text as="span" size="sm" weight="medium">
                        {dateLine.format(new Date(`${outlook.date}T12:00:00Z`))}
                      </Text>{" "}
                      {describeSymbol(outlook.symbol)}
                    </Text>
                    <Text size="xs" tone="muted">
                      {number.format(outlook.precipitation)} mm nedbør
                    </Text>
                  </Stack>
                ),
                trailing: `${degrees(outlook.min)} / ${degrees(outlook.max)}`,
              }))}
              columns={{ name: "Dag og vær", value: "Laveste og høyeste temperatur" }}
            />
          </PageSection>
          </>
        )}
        <Text size="xs" tone="muted">
          Værdata fra <ExternalLink href="https://www.yr.no">Yr</ExternalLink> (Meteorologisk institutt).
        </Text>
      </Stack>
    </Shell>
    </WeatherStage>
  )
}
