import { Banner } from "@lmfaole/designsystem/components/banner"
import { FormErrorSummary } from "@lmfaole/designsystem/components/form-error-summary"
import { InstallPrompt } from "@lmfaole/designsystem/components/install-prompt"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { SettingsSection } from "@lmfaole/designsystem/components/settings-section"
import { Text } from "@lmfaole/designsystem/components/text"
import { Button } from "@lmfaole/designsystem/components/ui/button"
import { cookies } from "next/headers"

import { settingsFields } from "../../components/settings-fields"
import { Shell } from "../../components/shell"
import { BASE } from "../../lib/links"
import { parsePosition, POSITION_COOKIE } from "../../lib/position"
import { SETTINGS_ENDPOINT, SETTINGS_PAGE } from "../../lib/settings"
import type { SearchParams } from "../../lib/username"
import { SEEN_PATH, settingsState } from "../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Innstillinger · Startside" }

/**
 * The same choices as the first-run wizard, all on one page and in one form to the settings endpoint, which comes back here with
 * `?lagret=1`, or with what GitHub did not have. The position is not a form field: it is shared from its own button, at once.
 * «Vis introen igjen» opens the wizard again on the front page.
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state, position] = await Promise.all([searchParams, settingsState(), cookies().then((jar) => parsePosition(jar.get(POSITION_COOKIE)?.value))])
  const fields = settingsFields({ ...state, position })
  const errors = Object.entries(state.problems?.errors ?? {}).map(([field, message]) => ({ field, message }))
  return (
    <Shell current="settings" firstRun={false} title="Innstillinger" lead="Hvem startsiden henter data for, hva den viser og hvordan den ser ut. Alt lagres i informasjonskapsler i denne nettleseren.">
      <Stack gap="xl">
        {params["lagret"] === "1" && errors.length === 0 ? <Banner title="Lagret">Innstillingene gjelder fra nå av i denne nettleseren.</Banner> : null}
        {errors.length === 0 ? null : <FormErrorSummary errors={errors} />}
        <form method="post" action={SETTINGS_ENDPOINT}>
          <input type="hidden" name="back" value={SETTINGS_PAGE} />
          <Stack gap="xl">
            <SettingsSection id="github" title="GitHub" body="Brukernavnet og repoene startsiden henter offentlige data for.">
              {fields.github}
              {fields.repos}
            </SettingsSection>
            <SettingsSection id="posisjon" title="Posisjon" body="Gir avganger fra holdeplassene nær deg og været der du er. Lagres med en gang du deler den.">
              {fields.position}
            </SettingsSection>
            <SettingsSection id="forside" title="Forside" body="Delene forsiden viser.">
              {fields.sections}
            </SettingsSection>
            <SettingsSection id="tema" title="Utseende">
              {fields.theme}
            </SettingsSection>
            <SettingsSection id="effekter" title="Effekter" body="Bakgrunnen og bildene kan tegnes i 3D.">
              {fields.effects}
            </SettingsSection>
            <SettingsSection id="lys" title="Lyset følger telefonen" body="Når du vipper telefonen, flytter lyset og skyggene seg.">
              {fields.tilt}
            </SettingsSection>
            <Button type="submit">Lagre</Button>
          </Stack>
        </form>
        <SettingsSection id="installer" title="Installer" body="Startside kan legges på hjemskjermen og åpnes i eget vindu.">
          <InstallPrompt appName="Startside" seen={false} cookiePath={SEEN_PATH} id="install-settings" />
          <Text tone="muted">Ser du ingen knapp, kan du legge den til fra nettleserens meny («Legg til på Hjem-skjerm» eller «Installer»).</Text>
        </SettingsSection>
        <SettingsSection id="intro" title="Introen" body="Gå gjennom de første valgene igjen, ett om gangen.">
          <form method="post" action={SETTINGS_ENDPOINT}>
            <input type="hidden" name="back" value={BASE} />
            <input type="hidden" name="rerun" value="1" />
            <Button type="submit" variant="outline">
              Vis introen igjen
            </Button>
          </form>
        </SettingsSection>
      </Stack>
    </Shell>
  )
}
