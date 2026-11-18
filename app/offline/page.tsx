import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { Text } from "@lmfaole/designsystem/components/text"

export const metadata = { title: "Frakoblet · Startside" }

/** Shown by the service worker when there is no network and no earlier copy of the page. */
export default function Offline() {
  return (
    <PageLayout>
      <PageHeader title="Frakoblet" lead="Startsiden trenger nett for å hente det som er nytt." />
      <Text tone="muted">Prøv igjen når du er tilkoblet.</Text>
    </PageLayout>
  )
}
