import { InstallPrompt } from "@lmfaole/designsystem/components/install-prompt"
import { SettingsSection } from "@lmfaole/designsystem/components/settings-section"
import { Text } from "@lmfaole/designsystem/components/text"

import { IntroAgain } from "../../../components/intro-again"
import { SettingsSubpageLayout } from "../../../components/settings-subpage"
import type { SearchParams } from "../../../lib/username"
import { SEEN_PATH, settingsState } from "../../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "App · Innstillinger · Startside" }

/** Installing the app, and the first-run introduction once more. */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state] = await Promise.all([searchParams, settingsState()])
  return (
    <SettingsSubpageLayout title="App" lead="Legg startsiden på hjemskjermen, eller gå gjennom introen igjen." params={params} problems={state.problems}>
      <SettingsSection id="installer" title="Installer" body="Startside kan legges på hjemskjermen og åpnes i eget vindu.">
        <InstallPrompt appName="Startside" seen={false} cookiePath={SEEN_PATH} id="install-settings" />
        <Text tone="muted">Ser du ingen knapp, kan du legge den til fra nettleserens meny («Legg til på Hjem-skjerm» eller «Installer»).</Text>
      </SettingsSection>
      <SettingsSection id="intro" title="Introen" body="Gå gjennom de første valgene igjen, ett om gangen.">
        <IntroAgain />
      </SettingsSection>
    </SettingsSubpageLayout>
  )
}
