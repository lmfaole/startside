import { strict as assert } from "node:assert"
import { test } from "node:test"

import { discussionNodes, groupDiscussions, LIMIT, type DiscussionItem, type DiscussionNode } from "./discussions.ts"

const item = (n: number, updated = `2026-11-${String(10 + n).padStart(2, "0")}T10:00:00Z`): DiscussionItem => ({
  key: String(n), href: `https://github.com/o/r/discussions/${n}`, title: `D${n}`, repo: "o/r", category: "Q&A", comments: n, created: "2026-11-01T10:00:00Z", updated,
})
const keys = (groups: ReturnType<typeof groupDiscussions>) => groups.map((group) => [group.id, group.items.map((i) => i.key)])

test("the ones you are in first, then the unanswered, each in the first group it belongs to", () => {
  const groups = groupDiscussions({ involved: [item(1), item(2)], unanswered: [item(2), item(3)] })
  assert.deepEqual(keys(groups), [["involved", ["2", "1"]], ["unanswered", ["3"]]])
  assert.deepEqual(groups.map((group) => group.title), ["Du er med i", "Ubesvarte"])
})

test("empty groups are left out, and a group shows at most ten, the most recently moved first", () => {
  assert.deepEqual(groupDiscussions({ involved: [], unanswered: [] }), [])
  assert.deepEqual(keys(groupDiscussions({ involved: [], unanswered: [item(1)] })), [["unanswered", ["1"]]])
  const many = Array.from({ length: 14 }, (_, i) => item(i + 1, new Date(Date.UTC(2026, 10, 1 + i)).toISOString()))
  const [group] = groupDiscussions({ involved: many, unanswered: [] })
  assert.equal(group?.items.length, LIMIT)
  assert.equal(group?.items[0]?.key, "14")
})

test("GraphQL's answer: hidden results and results that are not discussions are left out", () => {
  const node: DiscussionNode = { id: "D_1", url: "https://github.com/o/r/discussions/1", title: "T", createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-02T10:00:00Z", category: { name: "Ideer" }, comments: { totalCount: 3 }, repository: { nameWithOwner: "o/r" } }
  assert.deepEqual(discussionNodes([null, {}, node]), [{ key: "D_1", href: node.url, title: "T", repo: "o/r", category: "Ideer", comments: 3, created: node.createdAt, updated: node.updatedAt }])
  assert.equal(discussionNodes([{ ...node, category: null }])[0]?.category, "")
  assert.deepEqual(discussionNodes([]), [])
})
