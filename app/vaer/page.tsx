import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Heading, Text } from "@lmfaole/designsystem/components/text"
import { WeatherStage } from "@lmfaole/designsystem/components/weather-stage"
import { DumbbellChart } from "@lmfaole/designsystem/components/dumbbell-chart"
import { StatusLine } from "@lmfaole/designsystem/components/status-line"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { cookies } from "next/headers"

import { ForecastCharts } from "../../components/forecast-charts"
import { PositionControl } from "../../components/position"
import { Shell } from "../../components/shell"
import { dayOf, now } from "../../lib/day"
import { dailyOutlook, nextHours, summariseHours } from "../../lib/forecast"
import { dateLine, degrees, number } from "../../lib/format"
import { parsePosition, POSITION_COOKIE } from "../../lib/position"
import { settle } from "../../lib/settle"
import { describeSymbol, getForecast } from "../../lib/yr"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vær · Startside" }

/** The whole forecast: now and the day ahead in the card, the next 24 hours as charts, and the coming week as lowest to highest. */
export default async function Page() {
  const instant = now()
  const day = dayOf(instant)
  const position = parsePosition((await cookies()).get(POSITION_COOKIE)?.value)
  const forecast = await settle(getForecast(position))

  const current = forecast.ok ? forecast.value.timeseries[0] : undefined
  const symbol = current?.data.next_1_hours?.summary.symbol_code ?? current?.data.next_6_hours?.summary.symbol_code
  const chartHours = forecast.ok ? nextHours(forecast.value.timeseries, instant, 24) : []
  const summary = summariseHours(chartHours)
  const outlook = forecast.ok ? dailyOutlook(forecast.value.timeseries, day.date, 7) : []

  return (
    <WeatherStage symbol={symbol ?? "cloudy"} page>
    <Shell current="weather" title={forecast.ok ? `Vær i ${forecast.value.place}` : "Vær"} lead="Meldingen fra Yr: det neste døgnet og de neste dagene." actions={<PositionControl current={position} />}>
      <Stack gap="xl">
        {!forecast.ok ? (
          <ErrorMessage error={forecast.error}>Kunne ikke hente været</ErrorMessage>
        ) : (
          <>
          {current && symbol ? (
            <WeatherStage symbol={symbol}>
              <Stack gap="md">
                <Stack gap="xs">
                  <Text size="sm" weight="medium">
                    Nå
                  </Text>
                  <Heading level={2} look="page">
                    {degrees(current.data.instant.details.air_temperature)}
                  </Heading>
                  <Text size="sm">
                    {describeSymbol(symbol)}, vind {number.format(current.data.instant.details.wind_speed)} m/s
                  </Text>
                </Stack>
                {summary === null ? null : (
                  <StatusLine
                    items={[
                      { text: `Neste døgn ${degrees(summary.min)} til ${degrees(summary.max)}`, icon: "time" },
                      { text: summary.rain > 0 ? `${number.format(Math.round(summary.rain * 10) / 10)} mm nedbør` : "Ingen nedbør", icon: "rain" },
                      { text: `Vind opptil ${number.format(summary.wind)} m/s` },
                    ]}
                  />
                )}
              </Stack>
            </WeatherStage>
          ) : null}
          {chartHours.length > 1 ? (
            <PageSection id="next-hours" title="Neste døgn" icon="time">
              <ForecastCharts hours={chartHours} />
            </PageSection>
          ) : null}
          {outlook.length === 0 ? null : (
            <PageSection id="outlook" title="Kommende dager" icon="calendar">
              <DumbbellChart
                rows={outlook.map((one) => ({ label: `${dateLine.format(new Date(`${one.date}T12:00:00Z`))} · ${describeSymbol(one.symbol)}`, from: Math.round(one.min), to: Math.round(one.max) }))}
                fromLabel="Laveste"
                toLabel="Høyeste"
                ariaLabel="Laveste og høyeste temperatur de neste dagene"
                formatValue={degrees}
                keepOrder
                color="var(--weather-accent)"
              />
            </PageSection>
          )}
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
