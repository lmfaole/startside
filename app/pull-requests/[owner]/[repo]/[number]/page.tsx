import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { FactList } from "@lmfaole/designsystem/components/fact-list"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { LinkButton } from "@lmfaole/designsystem/components/link-button"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows } from "@lmfaole/designsystem/components/rows"
import { StatusLine, type Status } from "@lmfaole/designsystem/components/status-line"
import { Text } from "@lmfaole/designsystem/components/text"
import { notFound } from "next/navigation"

import { About, LatestComments } from "../../../../../components/detail"
import { Shell } from "../../../../../components/shell"
import { getPull } from "../../../../../lib/detail"
import { long } from "../../../../../lib/format"
import { parseRef } from "../../../../../lib/links"
import { checkLook, reviewStateText, statusLabels } from "../../../../../lib/pr-status"
import { settle } from "../../../../../lib/settle"

export const dynamic = "force-dynamic"

/** One pull request: how it stands, what it is, who reviews it, the checks and the last comments. The way out to GitHub is the last action. */
export default async function Page({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const ref = parseRef(await params)
  if (ref === null) notFound()
  const result = await settle(getPull(ref))
  const back = { path: "/pull-requests", label: "Pull requests" }
  if (!result.ok) {
    return (
      <Shell current="pull-requests" back={back} title={`Pull request #${ref.number}`}>
        <ErrorMessage error={result.error}>Kunne ikke hente pull requesten</ErrorMessage>
      </Shell>
    )
  }
  const pull = result.value
  if (pull === null) notFound()

  const status: Status[] = [
    ...(pull.state === "MERGED" ? [{ text: "Merget", icon: "merge" as const }] : pull.state === "CLOSED" ? [{ text: "Lukket", icon: "close" as const, tone: "muted" as const }] : []),
    ...(pull.state === "OPEN" ? statusLabels({ draft: pull.draft, checks: pull.checks, review: pull.review, mergeable: pull.mergeable, openThreads: pull.openThreads, author: null, size: null }, "mine") : []),
  ]

  return (
    <Shell current="pull-requests" back={back} title={pull.title} lead={`${ref.owner}/${ref.repo} #${ref.number}${pull.author === null ? "" : ` · av ${pull.author}`} · opprettet ${long.format(new Date(pull.created))}`}>
      <Stack gap="xl">
        <StatusLine items={status} />
        <Stack gap="xl">
          <About body={pull.body} />
          <PageSection id="facts" title="Fakta" icon="info">
            <FactList
              facts={[
                ["Gren", `${pull.head} → ${pull.base}`],
                ["Størrelse", `+${pull.size.additions} −${pull.size.deletions} · ${pull.size.files} ${pull.size.files === 1 ? "fil" : "filer"}`],
                ["Etiketter", pull.labels.join(", ")],
                ["Venter på review fra", pull.requested.join(", ")],
                ["Reviews", pull.reviews.map((review) => `${review.author}: ${reviewStateText(review.state)}`).join(", ")],
              ]}
            />
          </PageSection>
          {pull.checkLines.length === 0 ? null : (
            <PageSection id="checks" title="Tester" icon="success">
              <Rows
                lead="icon"
                rows={pull.checkLines.map((check) => {
                  const look = checkLook(check.state)
                  return { key: check.name, icon: look.icon, iconLabel: look.text, iconTone: look.tone, body: check.name, trailing: look.text }
                })}
                columns={{ name: "Test", value: "Status" }}
              />
            </PageSection>
          )}
          <LatestComments comments={pull.comments} />
        </Stack>
        <Text size="xs" tone="muted">
          Sist endret {long.format(new Date(pull.updated))}.
        </Text>
        <div>
          <LinkButton href={pull.url} external>
            Åpne på GitHub
          </LinkButton>
        </div>
      </Stack>
    </Shell>
  )
}
