import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { Markdown } from "@lmfaole/designsystem/components/markdown"
import { Text } from "@lmfaole/designsystem/components/text"

import type { Body, Comment } from "../lib/detail"
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
        {comment.text === "" ? (
          <Text size="sm" tone="muted">
            (uten tekst)
          </Text>
        ) : (
          <Markdown source={comment.text} size="sm" from="h4" />
        )}
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

/** What a thing is, in its own words: its description as Markdown, cut at a paragraph (the rest is on GitHub), or a quiet line where it has none. */
export function About({ body }: { body: Body }) {
  return (
    <PageSection id="about" title="Beskrivelse" icon="info">
      {body.text === "" ? (
        <Text tone="muted">Ingen beskrivelse.</Text>
      ) : (
        <Markdown source={body.text} />
      )}
      {body.cut ? (
        <Text size="xs" tone="muted">
          Beskrivelsen er kortet ned. Resten er på GitHub.
        </Text>
      ) : null}
    </PageSection>
  )
}
