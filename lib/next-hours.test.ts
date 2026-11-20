import assert from "node:assert/strict"
import { test } from "node:test"

import { nextHours, type Timeseries } from "./forecast.ts"

const entry = (hour: number, hourly = true): Timeseries => ({
  time: `2026-11-20T${String(hour).padStart(2, "0")}:00:00Z`,
  data: {
    instant: { details: { air_temperature: hour, wind_speed: 1 } },
    ...(hourly ? { next_1_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 0.5 } } } : {}),
    next_6_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 2 } },
  },
})

test("the chart starts at the hour it is now and stops at the count", () => {
  const series = [8, 9, 10, 11, 12, 13].map((hour) => entry(hour))
  const points = nextHours(series, new Date("2026-11-20T10:20:00Z"), 3)
  assert.deepEqual(points.map((point) => point.temperature), [10, 11, 12])
  assert.equal(points[0]?.precipitation, 0.5)
})

test("the chart ends where the forecast has no more hourly entries", () => {
  const series = [entry(10), entry(11), entry(12, false), entry(18, false)]
  assert.equal(nextHours(series, new Date("2026-11-20T10:00:00Z"), 24).length, 2)
})
