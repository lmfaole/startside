import { strict as assert } from "node:assert"
import { test } from "node:test"

import { pullNodes, readStatuses, statusLabels, toStatus, withStatus, type PullNode, type PullStatus } from "./pr-status.ts"

const base: PullStatus = { draft: false, checks: null, review: null, mergeable: "MERGEABLE", openThreads: 0, author: "kari" }
const texts = (status: Partial<PullStatus>, whose: "mine" | "theirs") => statusLabels({ ...base, ...status }, whose).map((label) => label.text)

test("my pull request: checks, conflicts, review and open conversations", () => {
  assert.deepEqual(texts({ checks: "SUCCESS", review: "APPROVED" }, "mine"), ["Tester OK", "Godkjent"])
  assert.deepEqual(texts({ checks: "FAILURE", mergeable: "CONFLICTING", review: "CHANGES_REQUESTED", openThreads: 2 }, "mine"), ["Tester feilet", "Konflikter", "Endringer ønskes", "2 åpne kommentarer"])
  assert.deepEqual(texts({ checks: "PENDING", review: "REVIEW_REQUIRED", openThreads: 1 }, "mine"), ["Tester kjører", "Venter på review", "1 åpen kommentar"])
  assert.deepEqual(texts({ checks: "ERROR" }, "mine"), ["Tester feilet"])
})

test("a draft says so, and is not waiting for a review", () => {
  assert.deepEqual(texts({ draft: true, review: "REVIEW_REQUIRED" }, "mine"), ["Utkast"])
})

test("no checks and no decision say nothing", () => {
  assert.deepEqual(texts({}, "mine"), [])
})

test("a pull request waiting for my review: who wrote it, and whether it is ready", () => {
  assert.deepEqual(texts({ checks: "SUCCESS", review: "REVIEW_REQUIRED", openThreads: 3 }, "theirs"), ["av kari", "Tester OK"])
  assert.deepEqual(texts({ draft: true, checks: "FAILURE", author: null }, "theirs"), ["Utkast", "Tester feilet"])
})

test("what stops a pull request is marked, the rest is not", () => {
  const tones = (status: Partial<PullStatus>) => Object.fromEntries(statusLabels({ ...base, ...status }, "mine").map((label) => [label.text, label.tone]))
  assert.deepEqual(tones({ checks: "FAILURE", mergeable: "CONFLICTING", review: "APPROVED" }), { "Tester feilet": "destructive", Konflikter: "destructive", Godkjent: "default" })
})

test("GraphQL's answer becomes a status", () => {
  const node: PullNode = {
    databaseId: 1, url: "https://github.com/o/r/pull/1", title: "T", updatedAt: "2026-11-18T10:00:00Z", isDraft: false, reviewDecision: "APPROVED", mergeable: "UNKNOWN",
    repository: { nameWithOwner: "o/r" }, author: { login: "ola" },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
    reviewThreads: { nodes: [{ isResolved: true }, { isResolved: false }, { isResolved: false }] },
  }
  assert.deepEqual(toStatus(node), { draft: false, checks: "SUCCESS", review: "APPROVED", mergeable: "UNKNOWN", openThreads: 2, author: "ola" })
  assert.equal(toStatus({ ...node, commits: { nodes: [] }, author: null }).checks, null)
  assert.equal(toStatus({ ...node, commits: { nodes: [{ commit: { statusCheckRollup: null } }] } }).checks, null)
})

test("hidden results (null) and results that are not pull requests are left out", () => {
  const node = { databaseId: 7 } as Partial<PullNode>
  assert.deepEqual(pullNodes([null, {}, node, null]), [node])
  assert.deepEqual(pullNodes([]), [])
})

const node = (n: number): PullNode => ({
  databaseId: n, url: `https://github.com/o/r/pull/${n}`, title: `T${n}`, updatedAt: "2026-11-18T10:00:00Z", isDraft: n === 2, reviewDecision: null, mergeable: "MERGEABLE",
  repository: { nameWithOwner: "o/r" }, author: null, commits: { nodes: [] }, reviewThreads: { nodes: [] },
})

test("the list comes from the search, and GraphQL adds a status where it could read the pull request", () => {
  const items = [1, 2, 3].map((n) => ({ href: `https://github.com/o/r/pull/${n}`, title: `T${n}` }))
  const statuses = readStatuses({ data: { search: { nodes: [node(1), null, node(3)] } }, errors: [{ message: "The 'X' enterprise forbids access via a fine-grained personal access token" }] })
  const merged = withStatus(items, statuses)
  assert.deepEqual(merged.map((item) => item.title), ["T1", "T2", "T3"])
  assert.deepEqual(merged.map((item) => item.status !== undefined), [true, false, true])
  assert.match(statuses.notice ?? "", /enterprise forbids/)
})

test("an answer without errors has no notice, and one without data leaves every item as it was", () => {
  assert.equal(readStatuses({ data: { search: { nodes: [node(1)] } } }).notice, null)
  const items = [{ href: "https://github.com/o/r/pull/1" }]
  assert.deepEqual(withStatus(items, readStatuses({ errors: [{ message: "Nope" }] })), items)
})
