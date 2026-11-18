import { strict as assert } from "node:assert"
import { test } from "node:test"

import { compare, leaveIn, minutesUntil, nextDepartures, tripName, type Stop, type Trip } from "./transit.ts"

const instant = new Date("2026-11-18T20:50:00+01:00")
const trip = (start: string, duration: number, legs: Trip["legs"]): Trip => ({ start, end: start, duration, legs })
const tram12: Trip = trip("2026-11-18T20:55:00+01:00", 1218, [{ mode: "walk", line: null, duration: 120 }, { mode: "tram", line: "12", duration: 900 }, { mode: "walk", line: null, duration: 100 }])

test("minutes until a time never go below zero", () => {
  assert.equal(minutesUntil("2026-11-18T20:55:00+01:00", instant), 5)
  assert.equal(minutesUntil("2026-11-18T20:40:00+01:00", instant), 0)
})

test("departures from all stops come soonest first, without what has gone", () => {
  const stop = (name: string, times: string[]): Stop => ({ id: name, name, distance: 1, departures: times.map((time) => ({ time, line: "1", destination: "X", mode: "bus", realtime: true, stop: name, distance: 0 })) })
  const list = nextDepartures([stop("A", ["2026-11-18T20:58:00+01:00", "2026-11-18T20:30:00+01:00"]), stop("B", ["2026-11-18T20:52:00+01:00"])], instant, 5)
  assert.deepEqual(list.map((d) => d.stop), ["B", "A"])
  assert.equal(nextDepartures([stop("A", ["2026-11-18T20:52:00+01:00", "2026-11-18T20:53:00+01:00"])], instant, 1).length, 1)
})

test("a departure that leaves before the reader can walk to the stop is left out", () => {
  const near: Stop = { id: "a", name: "A", distance: 240, departures: [{ time: "2026-11-18T20:52:00+01:00", line: "1", destination: "X", mode: "bus", realtime: true, stop: "A", distance: 240 }, { time: "2026-11-18T20:56:00+01:00", line: "2", destination: "X", mode: "bus", realtime: true, stop: "A", distance: 240 }] }
  assert.deepEqual(nextDepartures([near], instant, 5).map((d) => d.line), ["2"])
  assert.equal(leaveIn(near.departures[1]!, instant), 2)
})

test("a trip is named by what it rides", () => {
  assert.equal(tripName(tram12), "Trikk 12")
  assert.equal(tripName(trip("", 1, [{ mode: "bus", line: "54", duration: 1 }, { mode: "metro", line: "4", duration: 1 }])), "Buss 54 og T-bane 4")
})

test("a trip is compared with walking: when to leave and how much it saves", () => {
  const { walkMinutes, options } = compare(2089, [trip("", 100, [{ mode: "walk", line: null, duration: 100 }]), tram12], instant, 3)
  assert.equal(walkMinutes, 35)
  assert.equal(options.length, 1)
  assert.deepEqual([options[0]?.name, options[0]?.leaveIn, options[0]?.minutes, options[0]?.saves], ["Trikk 12", 5, 20, 15])
})
