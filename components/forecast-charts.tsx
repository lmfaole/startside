"use client"

import { AreaChart } from "@lmfaole/designsystem/components/area-chart"
import { ColumnChart } from "@lmfaole/designsystem/components/column-chart"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { Text } from "@lmfaole/designsystem/components/text"

import { clock } from "../lib/format"
import type { HourPoint } from "../lib/forecast"

const hourLabel = (label: string): string => clock.format(new Date(label))

/** The temperature and the rain hour by hour, one above the other on the same hours. A client component: the charts draw in the browser, and a label formatter cannot be passed from the server. */
export function ForecastCharts({ hours }: { hours: HourPoint[] }) {
  return (
    <Stack gap="lg">
      <AreaChart
        data={hours.map((hour) => ({ label: hour.time, value: Math.round(hour.temperature) }))}
        ariaLabel="Temperatur de neste timene"
        valueLabel="Temperatur (°C)"
        color="var(--weather-accent)"
        height={160}
        formatLabel={hourLabel}
        showTable
      />
      {hours.some((hour) => hour.precipitation > 0) ? (
        <ColumnChart
          data={hours.map((hour) => ({ label: hour.time, value: hour.precipitation }))}
          ariaLabel="Nedbør de neste timene"
          valueLabel="Nedbør (mm)"
          color="var(--weather-rain)"
          height={110}
          formatLabel={hourLabel}
          labelEvery={3}
          showTable
        />
      ) : (
        <Text size="sm" tone="muted">
          Ingen nedbør ventet de neste timene.
        </Text>
      )}
    </Stack>
  )
}
