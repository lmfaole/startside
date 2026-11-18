import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { FactList } from "@lmfaole/designsystem/components/fact-list"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { LinkButton } from "@lmfaole/designsystem/components/link-button"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { StatusLine, type Status } from "@lmfaole/designsystem/components/status-line"
import { Text } from "@lmfaole/designsystem/components/text"
import { notFound } from "next/navigation"

import { About, LatestComments } from "../../../../../components/detail"
import { GITHUB, Shell } from "../../../../../components/shell"
import { getIssue } from "../../../../../lib/detail"
import { long } from "../../../../../lib/format"
import { parseRef } from "../../../../../lib/links"
import { settle } from "../../../../../lib/settle"

export const dynamic = "force-dynamic"

/** One issue: how it stands, what it is, who has it, and the last comments. The way out to GitHub is the last action. */
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

  const status: Status[] = [
    issue.state === "OPEN" ? { text: "Åpen", icon: "issue" } : { text: "Lukket", icon: "done", tone: "muted" },
    issue.assignees.length === 0 ? { text: "Ingen eier", icon: "inbox", tone: "muted" } : { text: `Tildelt ${issue.assignees.join(", ")}`, icon: "person" },
  ]

  return (
    <Shell current="github" trail={trail} crumb={`#${ref.number}`} title={issue.title} lead={`${ref.owner}/${ref.repo} #${ref.number}${issue.author === null ? "" : ` · av ${issue.author}`} · opprettet ${long.format(new Date(issue.created))}`}>
      <Stack gap="xl">
        <StatusLine items={status} />
        <Stack gap="xl">
          <About body={issue.body} />
          <PageSection id="facts" title="Fakta" icon="info">
            <FactList facts={[["Etiketter", issue.labels], ["Tildelt", issue.assignees]]} />
          </PageSection>
          <LatestComments comments={issue.comments} />
        </Stack>
        <Text size="xs" tone="muted">
          Sist endret {long.format(new Date(issue.updated))}.
        </Text>
        <div>
          <LinkButton href={issue.url} external>
            Åpne på GitHub
          </LinkButton>
        </div>
      </Stack>
    </Shell>
  )
}
