import { strict as assert } from "node:assert"
import { test } from "node:test"

import { formatPosition, movedFar, parsePosition, roundPosition } from "./position.ts"

test("a position from a cookie, rounded to two decimals", () => {
  assert.deepEqual(parsePosition("59.9139,10.7522"), { lat: 59.91, lon: 10.75 })
  assert.deepEqual(parsePosition("59.91%2C10.75"), { lat: 59.91, lon: 10.75 })
  assert.deepEqual(parsePosition("-33.87,151.21"), { lat: -33.87, lon: 151.21 })
  assert.deepEqual(parsePosition("0,0"), { lat: 0, lon: 0 })
})

test("anything that is not a position is nothing", () => {
  for (const bad of [undefined, "", "abc", "59.91", "59.91,", "91,10", "59,181", "59.91,10.75,3", "59.91;10.75", "NaN,NaN", "1e3,2", "59.91, 10.75; x"]) {
    assert.equal(parsePosition(bad), null, String(bad))
  }
})

test("a position is written with two decimals and read back the same", () => {
  const written = formatPosition(roundPosition({ lat: 59.9139, lon: 10.7522 }))
  assert.equal(written, "59.91,10.75")
  assert.deepEqual(parsePosition(written), { lat: 59.91, lon: 10.75 })
})

test("moving about two kilometres counts as moving", () => {
  assert.equal(movedFar({ lat: 59.91, lon: 10.75 }, { lat: 59.92, lon: 10.76 }), false)
  assert.equal(movedFar({ lat: 59.91, lon: 10.75 }, { lat: 59.93, lon: 10.75 }), true)
  assert.equal(movedFar({ lat: 59.91, lon: 10.75 }, { lat: 59.91, lon: 10.79 }), true)
})
