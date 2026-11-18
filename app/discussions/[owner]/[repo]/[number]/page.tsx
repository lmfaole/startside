import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { FactList } from "@lmfaole/designsystem/components/fact-list"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { LinkButton } from "@lmfaole/designsystem/components/link-button"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { StatusLine, type Status } from "@lmfaole/designsystem/components/status-line"
import { Text } from "@lmfaole/designsystem/components/text"
import { notFound } from "next/navigation"

import { About, LatestComments } from "../../../../../components/detail"
import { Shell } from "../../../../../components/shell"
import { getDiscussion } from "../../../../../lib/detail"
import { long } from "../../../../../lib/format"
import { parseRef } from "../../../../../lib/links"
import { settle } from "../../../../../lib/settle"

export const dynamic = "force-dynamic"

/** One discussion: its category and whether it is answered, what it is, its answer, and the last comments. The way out to GitHub is the last action. */
export default async function Page({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const ref = parseRef(await params)
  if (ref === null) notFound()
  const result = await settle(getDiscussion(ref))
  const back = { path: "/discussions", label: "Discussions" }
  if (!result.ok) {
    return (
      <Shell current="discussions" back={back} title={`Discussion #${ref.number}`}>
        <ErrorMessage error={result.error}>Kunne ikke hente discussionen</ErrorMessage>
      </Shell>
    )
  }
  const discussion = result.value
  if (discussion === null) notFound()

  const status: Status[] = [
    ...(discussion.category === "" ? [] : [{ text: discussion.category, icon: "tag" as const, tone: "muted" as const }]),
    ...(discussion.answered === null ? [] : [discussion.answered ? { text: "Besvart", icon: "success" as const } : { text: "Ubesvart", icon: "question" as const, tone: "destructive" as const }]),
  ]

  return (
    <Shell current="discussions" back={back} crumb={`#${ref.number}`} title={discussion.title} lead={`${ref.owner}/${ref.repo} #${ref.number}${discussion.author === null ? "" : ` · av ${discussion.author}`} · opprettet ${long.format(new Date(discussion.created))}`}>
      <Stack gap="xl">
        <StatusLine items={status} />
        <Stack gap="xl">
          <About body={discussion.body} />
          <PageSection id="facts" title="Fakta" icon="info">
            <FactList facts={[["Kategori", discussion.category], ["Besvart av", discussion.answer?.author ?? ""]]} />
          </PageSection>
          {discussion.answer === null ? null : (
            <PageSection id="answer" title="Svaret" icon="success">
              <Stack width="prose">
                <Text size="sm" tone="muted">
                  {discussion.answer.author}
                </Text>
                <Text>{discussion.answer.text}</Text>
              </Stack>
            </PageSection>
          )}
          <LatestComments comments={discussion.comments} />
        </Stack>
        <Text size="xs" tone="muted">
          Sist endret {long.format(new Date(discussion.updated))}.
        </Text>
        <div>
          <LinkButton href={discussion.url} external>
            Åpne på GitHub
          </LinkButton>
        </div>
      </Stack>
    </Shell>
  )
}
