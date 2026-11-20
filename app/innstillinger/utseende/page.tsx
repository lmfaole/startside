import { SettingsSection } from "@lmfaole/designsystem/components/settings-section"

import { SettingsForm, SettingsSubpageLayout } from "../../../components/settings-subpage"
import { settingsFields } from "../../../components/settings-fields"
import type { SearchParams } from "../../../lib/username"
import { settingsState } from "../../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Utseende · Innstillinger · Startside" }

/** Theme, effects and the light: the `prefs` cookie, on `<html>` from the first frame. */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state] = await Promise.all([searchParams, settingsState()])
  const fields = settingsFields({ ...state, position: null })
  return (
    <SettingsSubpageLayout title="Utseende" lead="Lyst eller mørkt, og hvor levende siden er." params={params} problems={state.problems}>
      <SettingsForm slug="utseende">
        <SettingsSection id="tema" title="Tema">
          {fields.theme}
        </SettingsSection>
        <SettingsSection id="effekter" title="Effekter" body="Bakgrunnen og bildene kan tegnes i 3D og følge lyset.">
          {fields.effects}
        </SettingsSection>
        <SettingsSection id="lys" title="Lyset" body="Når du vipper telefonen, flytter lyset og skyggene seg.">
          {fields.tilt}
        </SettingsSection>
      </SettingsForm>
    </SettingsSubpageLayout>
  )
}
