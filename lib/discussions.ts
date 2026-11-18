export interface DiscussionItem {
  key: string
  href: string
  title: string
  repo: string
  category: string
  comments: number
  created: string
  updated: string
}

export type DiscussionGroupId = "involved" | "unanswered"

export interface DiscussionGroup {
  id: DiscussionGroupId
  title: string
  items: DiscussionItem[]
}

const TITLES: Record<DiscussionGroupId, string> = { involved: "Du er med i", unanswered: "Ubesvarte" }

/** How many a group shows. */
export const LIMIT = 10

const time = (iso: string) => new Date(iso).getTime()

/** Discussions in two groups: the ones you are in, and the ones nobody has answered. A discussion is in the first it belongs to; the most recently moved first, at most ten. */
export function groupDiscussions({ involved, unanswered }: { involved: readonly DiscussionItem[]; unanswered: readonly DiscussionItem[] }): DiscussionGroup[] {
  const placed = new Set<string>()
  const take = (items: readonly DiscussionItem[]): DiscussionItem[] => {
    const chosen = items.filter((item) => !placed.has(item.href))
    for (const item of chosen) placed.add(item.href)
    return [...chosen].sort((a, b) => time(b.updated) - time(a.updated)).slice(0, LIMIT)
  }
  const groups: [DiscussionGroupId, DiscussionItem[]][] = [["involved", take(involved)], ["unanswered", take(unanswered)]]
  return groups.filter(([, items]) => items.length > 0).map(([id, items]) => ({ id, title: TITLES[id], items }))
}

/** What GraphQL's `Discussion` has, as asked for in lib/github.ts. */
export interface DiscussionNode {
  id: string
  url: string
  title: string
  createdAt: string
  updatedAt: string
  category: { name: string } | null
  comments: { totalCount: number }
  repository: { nameWithOwner: string }
}

/** The discussions in a `search` answer: GraphQL puts `null` where it hides a result and `{}` where the result is not a discussion. */
export function discussionNodes(nodes: readonly (Partial<DiscussionNode> | null)[]): DiscussionItem[] {
  return nodes.flatMap((node) =>
    node === null || node.id === undefined || node.url === undefined || node.title === undefined || node.repository === undefined
      ? []
      : [{ key: node.id, href: node.url, title: node.title, repo: node.repository.nameWithOwner, category: node.category?.name ?? "", comments: node.comments?.totalCount ?? 0, created: node.createdAt ?? "", updated: node.updatedAt ?? node.createdAt ?? "" }],
  )
}
