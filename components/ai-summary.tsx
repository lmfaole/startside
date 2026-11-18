import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Text } from "@lmfaole/designsystem/components/text"
import { Suspense } from "react"

import { summarize } from "../lib/ai"
import type { SummaryInput, SummaryKind } from "../lib/summarize"

async function Summary({ kind, input }: { kind: SummaryKind; input: SummaryInput }) {
  const text = await summarize(kind, input)
  if (text === null) return null
  return (
    <PageSection id="summary" title="Oppsummering" icon="idea">
      <Text size="sm">{text}</Text>
      <Text size="xs" tone="muted">
        Skrevet av KI ut fra teksten, så den kan ha feil.
      </Text>
    </PageSection>
  )
}

/** The summary at the top of a page: made while the rest of the page is sent, so it never holds the page back, and left out if it cannot be made. */
export function AiSummary({ kind, input }: { kind: SummaryKind; input: SummaryInput }) {
  return (
    <Suspense fallback={null}>
      <Summary kind={kind} input={input} />
    </Suspense>
  )
}
