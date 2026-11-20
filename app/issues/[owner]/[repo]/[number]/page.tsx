import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { FactList } from "@lmfaole/designsystem/components/fact-list"
import { Split, Stack } from "@lmfaole/designsystem/components/layout"
import { LinkButton } from "@lmfaole/designsystem/components/link-button"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { StateSteps } from "@lmfaole/designsystem/components/state-steps"
import { StatusLine, type Status } from "@lmfaole/designsystem/components/status-line"
import { Text } from "@lmfaole/designsystem/components/text"
import { Time } from "@lmfaole/designsystem/components/time"
import { notFound } from "next/navigation"

import { AiSummary } from "../../../../../components/ai-summary"
import { About, History, TimeInState } from "../../../../../components/detail"
import { GitHubPerson } from "../../../../../components/person"
import { Byline } from "../../../../../components/byline"
import { GITHUB, Shell } from "../../../../../components/shell"
import { getIssue } from "../../../../../lib/detail"
import { now } from "../../../../../lib/day"
import { long } from "../../../../../lib/format"
import { parseRef } from "../../../../../lib/links"
import { settle } from "../../../../../lib/settle"
import { issueSpans, issueSteps, issueTimeline, truncatedNote } from "../../../../../lib/timeline"

export const dynamic = "force-dynamic"

/** One issue: how it stands, what it is, who has it, the time in each state and its history. The way out to GitHub is the last action. */
export default async function Page({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const ref = parseRef(await params)
  if (ref === null) notFound()
  const result = await settle(getIssue(ref))
  const trail = [GITHUB, { path: "/issues", label: "Issues" }]
  if (!result.ok) {
    return (
      <Shell current="github" trail={trail} title={`Issue #${ref.number}`}>
        <ErrorMessage error={result.error}>Kunne ikke hente issuen</ErrorMessage>
      </Shell>
    )
  }
  const issue = result.value
  if (issue === null) notFound()
  const at = now().toISOString()

  const status: Status[] = [
    issue.state === "OPEN" ? { text: "Åpen", icon: "issue" } : { text: "Lukket", icon: "done", tone: "muted" },
    issue.assignees.length === 0 ? { text: "Ingen eier", icon: "inbox", tone: "muted" } : { text: `Tildelt ${issue.assignees.join(", ")}`, icon: "person" },
  ]

  return (
    <Shell current="github" width="pane" trail={trail} crumb={`#${ref.number}`} title={issue.title} lead={<Byline at={ref} author={issue.author} created={issue.created} />}>
      {/* The status and the facts are the pane: looked up beside what is read on a wide screen, above it on a phone. */}
      <Split
        rail={
          <Stack gap="lg">
            <StatusLine items={status} />
            <PageSection id="facts" title="Fakta" icon="info">
              <FactList facts={[["Etiketter", issue.labels], ["Tildelt", issue.assignees.map((login) => <GitHubPerson key={login} login={login} />)]]} />
            </PageSection>
          </Stack>
        }
      >
        <StateSteps label={`Status for issue #${ref.number}`} steps={issueSteps(issue, at)} now={at} />
        <AiSummary kind="issue" input={{ title: issue.title, body: issue.body.text, comments: issue.comments.latest.map((comment) => `${comment.author}: ${comment.text}`) }} />
        <About body={issue.body} />
        <TimeInState spans={issueSpans(issue, at)} now={at} />
        <History label={`Historikk for issue #${ref.number}`} events={issueTimeline(issue)} note={truncatedNote(issue.timeline)} url={issue.url} now={at} />
        <Text size="xs" tone="muted">
          Sist endret <Time value={issue.updated} now={new Date(at)} format="datetime" />.
        </Text>
        <div>
          <LinkButton href={issue.url} external>
            Åpne på GitHub
          </LinkButton>
        </div>
      </Split>
    </Shell>
  )
}
