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
import { About, DetailIntro, History, TimeInState } from "../../../../../components/detail"
import { GitHubPerson } from "../../../../../components/person"
import { Byline } from "../../../../../components/byline"
import { GITHUB, Shell } from "../../../../../components/shell"
import { getDiscussion } from "../../../../../lib/detail"
import { now } from "../../../../../lib/day"
import { long } from "../../../../../lib/format"
import { parseRef } from "../../../../../lib/links"
import { settle } from "../../../../../lib/settle"
import { discussionSpans, discussionSteps, discussionTimeline, truncatedNote } from "../../../../../lib/timeline"

export const dynamic = "force-dynamic"

/** One discussion: its category and whether it is answered, what it is, its answer, the time in each state and its history. The way out to GitHub is the last action. */
export default async function Page({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const ref = parseRef(await params)
  if (ref === null) notFound()
  const result = await settle(getDiscussion(ref))
  const trail = [GITHUB, { path: "/discussions", label: "Discussions" }]
  if (!result.ok) {
    return (
      <Shell current="github" trail={trail} title={`Discussion #${ref.number}`}>
        <ErrorMessage error={result.error}>Kunne ikke hente discussionen</ErrorMessage>
      </Shell>
    )
  }
  const discussion = result.value
  if (discussion === null) notFound()
  const at = now().toISOString()

  const status: Status[] = [
    ...(discussion.category === "" ? [] : [{ text: discussion.category, icon: "tag" as const, tone: "muted" as const }]),
    ...(discussion.answered === null ? [] : [discussion.answered ? { text: "Besvart", icon: "success" as const } : { text: "Ubesvart", icon: "question" as const, tone: "destructive" as const }]),
  ]

  return (
    <Shell current="github" width="pane" trail={trail} crumb={`#${ref.number}`} title={discussion.title} lead={<Byline at={ref} author={discussion.author} created={discussion.created} />}>
      {/* The status and the facts are the pane: looked up beside what is read on a wide screen, above it on a phone. */}
      <Split
        rail={
          <Stack gap="lg">
            <StatusLine items={status} />
            <PageSection id="facts" title="Fakta" icon="info">
              <FactList facts={[["Kategori", discussion.category], ["Besvart av", discussion.answer === null ? "" : <GitHubPerson login={discussion.answer.author} />]]} />
            </PageSection>
          </Stack>
        }
      >
        <DetailIntro />
        <StateSteps label={`Status for discussion #${ref.number}`} steps={discussionSteps(discussion, at)} now={at} />
        <AiSummary kind="discussion" input={{ title: discussion.title, body: discussion.body.text, comments: discussion.comments.latest.map((comment) => `${comment.author}: ${comment.text}`) }} />
        <About body={discussion.body} />
        {discussion.answer === null ? null : (
          <PageSection id="answer" title="Svaret" icon="discussion">
            <Stack width="prose">
              <Text size="sm" tone="muted">
                <GitHubPerson login={discussion.answer.author} />
              </Text>
              <Text>{discussion.answer.text}</Text>
            </Stack>
          </PageSection>
        )}
        <TimeInState spans={discussionSpans(discussion, at)} now={at} />
        <History label={`Historikk for discussion #${ref.number}`} events={discussionTimeline(discussion)} note={truncatedNote(discussion.thread)} url={discussion.url} now={at} />
        <Text size="xs" tone="muted">
          Sist endret <Time value={discussion.updated} now={new Date(at)} format="datetime" />.
        </Text>
        <div>
          <LinkButton href={discussion.url} external>
            Åpne på GitHub
          </LinkButton>
        </div>
      </Split>
    </Shell>
  )
}
