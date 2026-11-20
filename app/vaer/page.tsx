import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows } from "@lmfaole/designsystem/components/rows"
import { Heading, Text } from "@lmfaole/designsystem/components/text"
import { WeatherStage } from "@lmfaole/designsystem/components/weather-stage"
import { DumbbellChart } from "@lmfaole/designsystem/components/dumbbell-chart"
import { Sparkline } from "@lmfaole/designsystem/components/sparkline"
import { StatusLine } from "@lmfaole/designsystem/components/status-line"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { cookies } from "next/headers"

import { ForecastCharts } from "../../components/forecast-charts"
import { PositionControl } from "../../components/position"
import { Shell } from "../../components/shell"
import { dayOf, now } from "../../lib/day"
import { dailyOutlook, nextHours, summariseHours, weatherIcon } from "../../lib/forecast"
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

  const current = forecast.ok ? forecast.value.timeseries[0] : undefined
  const symbol = current?.data.next_1_hours?.summary.symbol_code ?? current?.data.next_6_hours?.summary.symbol_code
  const chartHours = forecast.ok ? nextHours(forecast.value.timeseries, instant, 24) : []
  const summary = summariseHours(chartHours)
  const outlook = forecast.ok ? dailyOutlook(forecast.value.timeseries, day.date, 5) : []

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
          {chartHours.length > 1 ? (
            <PageSection id="next-hours" title="Neste døgn" icon="time">
              <Stack gap="md">
                {summary === null ? null : (
                  <StatusLine
                    items={[
                      { text: `Laveste ${degrees(summary.min)}, høyeste ${degrees(summary.max)}` },
                      { text: summary.rain > 0 ? `${number.format(Math.round(summary.rain * 10) / 10)} mm nedbør` : "Ingen nedbør", icon: "rain" },
                      { text: `Vind opptil ${number.format(summary.wind)} m/s` },
                    ]}
                  />
                )}
                <ForecastCharts hours={chartHours} />
                <Text as="span" size="xs" tone="muted">
                  Vind <Sparkline values={chartHours.map((hour) => hour.wind)} label="Vind de neste timene" color="var(--weather-accent)" />
                </Text>
              </Stack>
            </PageSection>
          ) : null}
          <PageSection id="outlook" title="Kommende dager" icon="calendar">
            <DumbbellChart
              rows={outlook.map((one) => ({ label: dateLine.format(new Date(`${one.date}T12:00:00Z`)), from: Math.round(one.min), to: Math.round(one.max) }))}
              fromLabel="Laveste"
              toLabel="Høyeste"
              ariaLabel="Laveste og høyeste temperatur de neste dagene"
              formatValue={degrees}
              keepOrder
              color="var(--weather-accent)"
            />
            <Rows
              lead="icon"
              rows={outlook.map((outlook) => ({
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
