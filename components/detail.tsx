import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { Text } from "@lmfaole/designsystem/components/text"

import type { Comment } from "../lib/detail"
import { short } from "../lib/format"

/** The last few comments of a thing: who, when and a short text of each; the whole conversation is where it lives, at the end. */
export function LatestComments({ comments, title = "Siste kommentarer" }: { comments: { total: number; latest: Comment[] }; title?: string }) {
  if (comments.total === 0) return null
  const rows: RowData[] = comments.latest.map((comment) => ({
    key: `${comment.author}-${comment.created}`,
    icon: "discussion",
    body: (
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          {comment.author}
        </Text>
        <Text size="sm" tone="muted">
          {comment.text || "(uten tekst)"}
        </Text>
      </Stack>
    ),
    trailing: short.format(new Date(comment.created)),
  }))
  return (
    <PageSection id="comments" title={`${title} (${comments.total})`} icon="discussion">
      <Rows lead="icon" rows={rows} columns={{ name: "Kommentar", value: "Dato" }} />
    </PageSection>
  )
}

/** What a thing is, in its own words: the first of its text, or a quiet line where it has none. */
export function About({ text }: { text: string }) {
  return (
    <PageSection id="about" title="Beskrivelse" icon="info">
      <Stack width="prose">
        <Text tone={text === "" ? "muted" : "default"}>{text === "" ? "Ingen beskrivelse." : text}</Text>
      </Stack>
    </PageSection>
  )
}
