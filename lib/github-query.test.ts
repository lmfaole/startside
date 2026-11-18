import { strict as assert } from "node:assert"
import { test } from "node:test"

import { scope } from "./github-query.ts"

test("only public repositories, without the excluded organisations", () => {
  assert.equal(scope(undefined), "is:public")
  assert.equal(scope(""), "is:public")
  assert.equal(scope("fremtind"), "is:public -org:fremtind")
  assert.equal(scope(" fremtind , other-org ,"), "is:public -org:fremtind -org:other-org")
})

test("anything that is not an organisation name is dropped, so it cannot add search terms", () => {
  assert.equal(scope("fremtind archived:false, -is:public, a/b"), "is:public")
  assert.equal(scope("ok,bad org,also-ok"), "is:public -org:ok -org:also-ok")
})
