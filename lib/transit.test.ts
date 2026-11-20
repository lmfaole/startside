import { strict as assert } from "node:assert"
import { test } from "node:test"

import { modeOf, noticeOf, toBoard, walkMinutesOver, type Departure } from "./transit.ts"

const departure = (time: string, more: Partial<Departure> = {}): Departure => ({ time, aimed: time, cancelled: false, quay: null, notice: null, line: "1", destination: "X", mode: "bus", realtime: true, stop: "A", distance: 0, ...more })

test("Entur's modes: trains, boats and coaches have their own, anything unknown is other", () => {
  assert.deepEqual(["foot", "coach", "rail", "water", "metro", "air", null].map(modeOf), ["walk", "bus", "rail", "ferry", "metro", "other", "other"])
})

test("the notice of a departure is the Norwegian summary of its first situation, else the first one there is", () => {
  assert.equal(noticeOf([{ summary: [{ value: "Cancelled", language: "en" }, { value: "Innstilt ", language: "no" }] }]), "Innstilt")
  assert.equal(noticeOf([{ summary: [{ value: " ", language: "nob" }, { value: "Delayed", language: "en" }] }]), "Delayed")
  assert.equal(noticeOf([]), null)
})

test("a departure for the board has its times, its state and only the details it has", () => {
  const late = departure("2026-11-18T20:59:00+01:00", { aimed: "2026-11-18T20:55:00+01:00", quay: "B", mode: "walk" })
  assert.deepEqual(toBoard(late, "k"), { key: "k", line: "1", mode: "other", destination: "X", expected: "2026-11-18T20:59:00+01:00", aimed: "2026-11-18T20:55:00+01:00", realtime: true, quay: "B" })
  const gone = toBoard(departure("2026-11-18T20:55:00+01:00", { cancelled: true, notice: "Innstilt" }))
  assert.deepEqual([gone.cancelled, gone.notice, "quay" in gone], [true, "Innstilt", false])
  assert.notEqual(gone.key, toBoard(departure("2026-11-18T21:05:00+01:00")).key)
})

test("the walk to a stop is about a metre a second, and never under a minute", () => {
  assert.equal(walkMinutesOver(590), 10)
  assert.equal(walkMinutesOver(10), 1)
})
