/** What GitHub knows about a pull request, as its GraphQL API words it. */
export interface PullStatus {
  draft: boolean
  /** The state of the checks on the last commit; none where the repository has no checks. */
  checks: "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" | null
  review: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
  /** Review conversations that are still open. */
  openThreads: number
  author: string | null
}

export interface Label {
  text: string
  /** `bad` is for what stops the pull request: failing checks, conflicts, changes asked for. */
  tone: "default" | "muted" | "destructive"
}

/**
 * The status of a pull request as a few short labels, worst first. Your own pull requests show their review state
 * (is anyone to answer, can it be merged); the ones waiting for your review show who wrote them, since the review is yours.
 */
export function statusLabels(status: PullStatus, whose: "mine" | "theirs"): Label[] {
  const labels: Label[] = []
  if (whose === "theirs" && status.author !== null) labels.push({ text: `av ${status.author}`, tone: "muted" })
  if (status.draft) labels.push({ text: "Utkast", tone: "muted" })
  if (status.checks === "FAILURE" || status.checks === "ERROR") labels.push({ text: "Tester feilet", tone: "destructive" })
  else if (status.checks === "PENDING" || status.checks === "EXPECTED") labels.push({ text: "Tester kjører", tone: "muted" })
  else if (status.checks === "SUCCESS") labels.push({ text: "Tester OK", tone: "default" })
  if (status.mergeable === "CONFLICTING") labels.push({ text: "Konflikter", tone: "destructive" })
  if (whose === "mine") {
    if (status.review === "CHANGES_REQUESTED") labels.push({ text: "Endringer ønskes", tone: "destructive" })
    else if (status.review === "APPROVED") labels.push({ text: "Godkjent", tone: "default" })
    else if (status.review === "REVIEW_REQUIRED" && !status.draft) labels.push({ text: "Venter på review", tone: "muted" })
    if (status.openThreads > 0) labels.push({ text: status.openThreads === 1 ? "1 åpen kommentar" : `${status.openThreads} åpne kommentarer`, tone: "destructive" })
  }
  return labels
}

/** The pull request fields of GraphQL's answer, as `search` returns them. */
export interface PullNode {
  databaseId: number
  url: string
  title: string
  updatedAt: string
  isDraft: boolean
  reviewDecision: PullStatus["review"]
  mergeable: PullStatus["mergeable"]
  repository: { nameWithOwner: string }
  author: { login: string } | null
  commits: { nodes: { commit: { statusCheckRollup: { state: NonNullable<PullStatus["checks"]> } | null } }[] }
  reviewThreads: { nodes: { isResolved: boolean }[] }
}

export function toStatus(node: PullNode): PullStatus {
  return {
    draft: node.isDraft,
    checks: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
    review: node.reviewDecision,
    mergeable: node.mergeable,
    openThreads: node.reviewThreads.nodes.filter((thread) => !thread.isResolved).length,
    author: node.author?.login ?? null,
  }
}

/** The pull requests in a `search` answer: GraphQL puts `null` where it hides a result and `{}` where the result is not a pull request. */
export function pullNodes(nodes: readonly (Partial<PullNode> | null)[]): PullNode[] {
  return nodes.filter((node): node is PullNode => node !== null && node.databaseId !== undefined)
}

/** What GraphQL could say about a list of pull requests, by address. It leaves out what the token may not read (an organisation can block it). */
export type Statuses = Map<string, PullStatus>

/** The statuses in a GraphQL `search` answer. */
export function readStatuses(answer: { data?: { search: { nodes: readonly (Partial<PullNode> | null)[] } } }): Statuses {
  return new Map(pullNodes(answer.data?.search.nodes ?? []).map((node) => [node.url, toStatus(node)]))
}

/** The items with the status GraphQL had for them, in the order they came; those it had none for are kept without one. */
export function withStatus<Item extends { href: string }>(items: readonly Item[], statuses: Statuses): (Item & { status?: PullStatus })[] {
  return items.map((item) => {
    const status = statuses.get(item.href)
    return status === undefined ? item : { ...item, status }
  })
}
