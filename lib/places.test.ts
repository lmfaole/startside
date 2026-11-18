import { strict as assert } from "node:assert"
import { test } from "node:test"

import { DEFAULT_WORK, distance, formatHome, journeyFor, parseHome } from "./places.ts"

const home = { name: "Hjem", lat: 59.9347, lon: 10.7589 }

test("a home position is read from the cookie, and nothing else is", () => {
  assert.deepEqual(parseHome("59.935,10.759"), { name: "Hjem", lat: 59.935, lon: 10.759 })
  assert.equal(parseHome("abc"), null)
  assert.equal(parseHome(undefined), null)
  assert.equal(formatHome(home), "59.935,10.759")
})

test("the distance between two positions is in metres", () => {
  assert.ok(Math.abs(distance(home, DEFAULT_WORK) - 2_240) < 150)
  assert.equal(distance(home, home), 0)
})

test("at work the way is home, at home the way is to work", () => {
  const weekday = { part: "kveld", weekend: false } as const
  assert.equal(journeyFor({ position: DEFAULT_WORK, work: DEFAULT_WORK, home, day: weekday })?.to, home)
  const out = journeyFor({ position: home, work: DEFAULT_WORK, home, day: weekday })
  assert.equal(out?.from, home)
  assert.equal(out?.to, DEFAULT_WORK)
})

test("somewhere else the way is to work in the morning and home otherwise", () => {
  const position = { lat: 59.95, lon: 10.8 }
  assert.equal(journeyFor({ position, work: DEFAULT_WORK, home, day: { part: "morgen", weekend: false } })?.to, DEFAULT_WORK)
  assert.equal(journeyFor({ position, work: DEFAULT_WORK, home, day: { part: "kveld", weekend: false } })?.to, home)
  assert.equal(journeyFor({ position, work: DEFAULT_WORK, home, day: { part: "morgen", weekend: true } })?.to, home)
})

test("without a position the time of day says where the reader is, and without a home there is no way back", () => {
  const none = { position: null, work: DEFAULT_WORK }
  assert.equal(journeyFor({ ...none, home, day: { part: "arbeidsdag", weekend: false } })?.from, DEFAULT_WORK)
  assert.equal(journeyFor({ ...none, home, day: { part: "kveld", weekend: false } })?.from, home)
  assert.equal(journeyFor({ ...none, home: null, day: { part: "kveld", weekend: false } }), null)
  assert.equal(journeyFor({ ...none, home: null, day: { part: "arbeidsdag", weekend: false } })?.to, null)
})
