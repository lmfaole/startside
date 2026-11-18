import { strict as assert } from "node:assert"
import { test } from "node:test"

import { isWatched, repoQualifiers, scope } from "./github-query.ts"

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

test("the watched repositories as qualifiers, and nothing else", () => {
  assert.equal(repoQualifiers(undefined), "")
  assert.equal(repoQualifiers(""), "")
  assert.equal(repoQualifiers("fremtind/jokul"), "repo:fremtind/jokul")
  assert.equal(repoQualifiers(" fremtind/jokul , lmfaole/startside.v2 ,"), "repo:fremtind/jokul repo:lmfaole/startside.v2")
  assert.equal(repoQualifiers("jokul, a/b archived:false, -x/y, a/b/c"), "")
})

test("whether a repository is watched, whatever its case; with none watched, all are", () => {
  assert.equal(isWatched("fremtind/jokul", "fremtind/jokul"), true)
  assert.equal(isWatched("Fremtind/Jokul", "fremtind/jokul, a/b"), true)
  assert.equal(isWatched("lmfaole/startside", "fremtind/jokul"), false)
  assert.equal(isWatched("lmfaole/startside", undefined), true)
  assert.equal(isWatched("lmfaole/startside", "not a repo"), true)
})
