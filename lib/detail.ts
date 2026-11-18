import { truncateMarkdown } from "./digest"
import { env } from "./env"
import type { Ref } from "./links"
import { upstream } from "./upstream"

/** A person's text under a pull request, an issue or a discussion, in Markdown. */
export interface Comment {
  author: string
  created: string
  text: string
}

/** A description in Markdown, cut for the page: its text, and whether the rest is left out. */
export interface Body {
  text: string
  cut: boolean
}

interface CommentNode {
  author: { login: string } | null
  createdAt: string
  body: string
}

interface Comments {
  totalCount: number
  nodes: (CommentNode | null)[]
}

const COMMENTS = "comments(last: 3) { totalCount nodes { author { login } createdAt body } }"

/** How much of a description or a comment is shown (Markdown, cut at a paragraph): enough to decide; the whole is on GitHub. */
const BODY_MAX = 6000
const COMMENT_MAX = 1200

const toComments = (comments: Comments): { total: number; latest: Comment[] } => ({
  total: comments.totalCount,
  latest: comments.nodes.flatMap((node) => (node === null ? [] : [{ author: node.author?.login ?? "ukjent", created: node.createdAt, text: truncateMarkdown(node.body, COMMENT_MAX).text }])),
})

async function ask<T>(query: string, ref: Ref): Promise<T> {
  const token = env("GITHUB_TOKEN")
  if (!token && !env("UPSTREAM_URL")) throw new Error("GITHUB_TOKEN er ikke satt")
  const response = await upstream("https://api.github.com/graphql", {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "User-Agent": "startside" },
    json: { query, variables: { owner: ref.owner, name: ref.repo, number: ref.number } },
    revalidate: 60,
  })
  if (!response.ok) throw new Error(response.status === 500 ? await response.text() : `GitHub (GraphQL) svarte ${response.status}`)
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (body.data === undefined) throw new Error(body.errors?.[0]?.message ?? "GitHub svarte uten data")
  return body.data
}

export interface CheckLine {
  name: string
  /** What GitHub says: a conclusion (`SUCCESS`, `FAILURE`, `NEUTRAL`, `SKIPPED` …) or a state while it runs. */
  state: string
}

export interface PullDetail {
  title: string
  url: string
  /** `OPEN`, `CLOSED` or `MERGED`. */
  state: string
  draft: boolean
  author: string | null
  created: string
  updated: string
  body: Body
  head: string
  base: string
  size: { additions: number; deletions: number; files: number }
  checks: "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" | null
  checkLines: CheckLine[]
  review: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
  openThreads: number
  labels: string[]
  requested: string[]
  reviews: { author: string; state: string }[]
  comments: { total: number; latest: Comment[] }
}

/** One pull request with what is needed to decide what to do with it: its text, checks, reviewers and last comments. `null` where there is no such pull request. */
export async function getPull(ref: Ref): Promise<PullDetail | null> {
  type Node = {
    title: string; url: string; state: string; isDraft: boolean; body: string; createdAt: string; updatedAt: string
    author: { login: string } | null; headRefName: string; baseRefName: string
    additions: number; deletions: number; changedFiles: number
    reviewDecision: PullDetail["review"]; mergeable: PullDetail["mergeable"]
    labels: { nodes: { name: string }[] }
    reviewRequests: { nodes: { requestedReviewer: { login?: string; name?: string } | null }[] }
    latestReviews: { nodes: { state: string; author: { login: string } | null }[] }
    reviewThreads: { nodes: { isResolved: boolean }[] }
    commits: { nodes: { commit: { statusCheckRollup: { state: NonNullable<PullDetail["checks"]>; contexts: { nodes: ({ __typename: string; name?: string; conclusion?: string | null; status?: string; context?: string; state?: string } | null)[] } } | null } }[] }
    comments: Comments
  }
  const data = await ask<{ repository: { pullRequest: Node | null } | null }>(
    `query ($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) {
      title url state isDraft body createdAt updatedAt author { login } headRefName baseRefName additions deletions changedFiles reviewDecision mergeable
      labels(first: 10) { nodes { name } }
      reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Team { name } } } }
      latestReviews(first: 10) { nodes { state author { login } } }
      reviewThreads(first: 50) { nodes { isResolved } }
      commits(last: 1) { nodes { commit { statusCheckRollup { state contexts(first: 30) { nodes { __typename ... on CheckRun { name conclusion status } ... on StatusContext { context state } } } } } } }
      ${COMMENTS}
    } } }`,
    ref,
  )
  const pull = data.repository?.pullRequest
  if (pull === null || pull === undefined) return null
  const rollup = pull.commits.nodes[0]?.commit.statusCheckRollup ?? null
  return {
    title: pull.title, url: pull.url, state: pull.state, draft: pull.isDraft, author: pull.author?.login ?? null, created: pull.createdAt, updated: pull.updatedAt,
    body: truncateMarkdown(pull.body, BODY_MAX), head: pull.headRefName, base: pull.baseRefName,
    size: { additions: pull.additions, deletions: pull.deletions, files: pull.changedFiles },
    checks: rollup?.state ?? null,
    checkLines: (rollup?.contexts.nodes ?? []).flatMap((node) => (node === null ? [] : [node.__typename === "CheckRun" ? { name: node.name ?? "Sjekk", state: node.conclusion ?? node.status ?? "PENDING" } : { name: node.context ?? "Status", state: node.state ?? "PENDING" }])),
    review: pull.reviewDecision, mergeable: pull.mergeable, openThreads: pull.reviewThreads.nodes.filter((thread) => !thread.isResolved).length,
    labels: pull.labels.nodes.map((label) => label.name),
    requested: pull.reviewRequests.nodes.flatMap((request) => request.requestedReviewer?.login ?? request.requestedReviewer?.name ?? []),
    reviews: pull.latestReviews.nodes.map((review) => ({ author: review.author?.login ?? "ukjent", state: review.state })),
    comments: toComments(pull.comments),
  }
}

export interface IssueDetail {
  title: string
  url: string
  state: string
  author: string | null
  created: string
  updated: string
  body: Body
  labels: string[]
  assignees: string[]
  comments: { total: number; latest: Comment[] }
}

/** One issue: its text, labels, who it is assigned to and the last comments. `null` where there is no such issue. */
export async function getIssue(ref: Ref): Promise<IssueDetail | null> {
  type Node = { title: string; url: string; state: string; body: string; createdAt: string; updatedAt: string; author: { login: string } | null; labels: { nodes: { name: string }[] }; assignees: { nodes: { login: string }[] }; comments: Comments }
  const data = await ask<{ repository: { issue: Node | null } | null }>(
    `query ($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { issue(number: $number) {
      title url state body createdAt updatedAt author { login }
      labels(first: 10) { nodes { name } }
      assignees(first: 5) { nodes { login } }
      ${COMMENTS}
    } } }`,
    ref,
  )
  const issue = data.repository?.issue
  if (issue === null || issue === undefined) return null
  return {
    title: issue.title, url: issue.url, state: issue.state, author: issue.author?.login ?? null, created: issue.createdAt, updated: issue.updatedAt,
    body: truncateMarkdown(issue.body, BODY_MAX), labels: issue.labels.nodes.map((label) => label.name), assignees: issue.assignees.nodes.map((assignee) => assignee.login),
    comments: toComments(issue.comments),
  }
}

export interface DiscussionDetail {
  title: string
  url: string
  category: string
  /** `true` or `false` in a category with answers, `null` in the others. */
  answered: boolean | null
  author: string | null
  created: string
  updated: string
  body: Body
  answer: Comment | null
  comments: { total: number; latest: Comment[] }
}

/** One discussion: its text, its answer if it has one, and the last comments. `null` where there is no such discussion. */
export async function getDiscussion(ref: Ref): Promise<DiscussionDetail | null> {
  type Node = { title: string; url: string; body: string; createdAt: string; updatedAt: string; isAnswered: boolean | null; author: { login: string } | null; category: { name: string } | null; answer: CommentNode | null; comments: Comments }
  const data = await ask<{ repository: { discussion: Node | null } | null }>(
    `query ($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { discussion(number: $number) {
      title url body createdAt updatedAt isAnswered author { login } category { name }
      answer { author { login } createdAt body }
      ${COMMENTS}
    } } }`,
    ref,
  )
  const discussion = data.repository?.discussion
  if (discussion === null || discussion === undefined) return null
  return {
    title: discussion.title, url: discussion.url, category: discussion.category?.name ?? "", answered: discussion.isAnswered, author: discussion.author?.login ?? null,
    created: discussion.createdAt, updated: discussion.updatedAt, body: truncateMarkdown(discussion.body, BODY_MAX),
    answer: discussion.answer === null ? null : { author: discussion.answer.author?.login ?? "ukjent", created: discussion.answer.createdAt, text: truncateMarkdown(discussion.answer.body, COMMENT_MAX).text },
    comments: toComments(discussion.comments),
  }
}
