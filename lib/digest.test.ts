import { strict as assert } from "node:assert"
import { test } from "node:test"

import { countOf, excerpt, takeFirst } from "./digest.ts"

test("the first few from lists already in the order of need", () => {
  assert.deepEqual(takeFirst([["a", "b"], [], ["c", "d", "e"]], 4), ["a", "b", "c", "d"])
  assert.deepEqual(takeFirst([["a"]], 4), ["a"])
  assert.deepEqual(takeFirst([], 4), [])
  assert.deepEqual(takeFirst([["a", "b"]], 0), [])
})

test("how many are in a group, zero where there is none", () => {
  const groups = [{ id: "blocked", items: [1, 2] }, { id: "ready", items: [3] }]
  assert.equal(countOf(groups, "blocked", (group) => group.items.length), 2)
  assert.equal(countOf(groups, "review" as never, (group) => group.items.length), 0)
})

test("an excerpt is cut at a word, with an ellipsis, and a short text is left alone", () => {
  assert.equal(excerpt("Kort tekst."), "Kort tekst.")
  assert.equal(excerpt(null), "")
  assert.equal(excerpt("  linje en\n\nlinje   to  "), "linje en linje to")
  const long = "Dette er en lang beskrivelse av en endring som går over flere ord og setninger, og den skal kuttes ved et ord. ".repeat(6)
  const short = excerpt(long, 100)
  assert.ok(short.length <= 101, String(short.length))
  assert.ok(short.endsWith("…"))
  assert.doesNotMatch(short, /\s…$/)
  assert.equal(excerpt("x".repeat(500), 50), `${"x".repeat(50)}…`)
})
