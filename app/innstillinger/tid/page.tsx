import { Banner } from "@lmfaole/designsystem/components/banner"
import { CheckboxList } from "@lmfaole/designsystem/components/checkbox-list"
import { ChoiceCards } from "@lmfaole/designsystem/components/choice-cards"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { SettingsSection } from "@lmfaole/designsystem/components/settings-section"
import { TimeField } from "@lmfaole/designsystem/components/time-field"
import { ToggleMatrix } from "@lmfaole/designsystem/components/toggle-matrix"

import { SettingsForm, SettingsSubpageLayout } from "../../../components/settings-subpage"
import { formatTime, PARTS } from "../../../lib/day-settings"
import { SECTION_OPTIONS } from "../../../lib/settings"
import type { SearchParams } from "../../../lib/username"
import { settingsState, visitorDaySettings } from "../../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tid på døgnet · Innstillinger · Startside" }

const PART_LABEL = { morgen: "Morgen", arbeidsdag: "Arbeidsdag", kveld: "Kveld", natt: "Natt" } as const

/** Monday first, as a Norwegian week; the values are `Date.getDay()`'s. */
const WEEKDAYS = [
  { value: "1", label: "Mandag" },
  { value: "2", label: "Tirsdag" },
  { value: "3", label: "Onsdag" },
  { value: "4", label: "Torsdag" },
  { value: "5", label: "Fredag" },
  { value: "6", label: "Lørdag" },
  { value: "0", label: "Søndag" },
]

/**
 * The time of day (`startside_day`, lib/day-settings.ts): when each part starts and what the front page has then. One form with `day=1`;
 * nothing is disabled (the checkbox groups are read as they are), and with the time control off the rest is kept for when it is on again.
 * A wrong start comes back at `#tider` with what was written.
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state, settings] = await Promise.all([searchParams, settingsState(), visitorDaySettings()])
  const written = state.problems?.values.starts?.split(",")
  const startsError = state.problems?.errors.starts
  return (
    <SettingsSubpageLayout title="Tid på døgnet" lead="Forsiden kan endre seg gjennom dagen: hva den viser om morgenen, på jobb, om kvelden og om natten." params={params} problems={state.problems}>
      <SettingsForm slug="tid" hidden={{ day: "1" }}>
        <SettingsSection id="styring" title="Tidsstyring">
          <ChoiceCards
            name="mode"
            legend="Følg tiden på døgnet"
            value={settings.mode}
            hint="Resten av innstillingene her gjelder bare når tidsstyringen er på."
            options={[
              { value: "auto", label: "Automatisk", description: "Forsiden følger delene av døgnet og helgen under.", icon: "time" },
              { value: "off", label: "Av", description: "Den samme forsiden hele dagen: alle delene, været i dag og alle pull requests.", icon: "pause" },
            ]}
          />
          {settings.mode === "off" ? (
            <Banner tone="info" title="Tidsstyringen er av">
              Du kan likevel endre resten. Det tas i bruk når du slår tidsstyringen på igjen.
            </Banner>
          ) : null}
          <ChoiceCards
            name="greeting"
            legend="Hilsen øverst"
            value={settings.greeting}
            options={[
              { value: "on", label: "Med hilsen", description: "«God morgen», «God dag», «God kveld» eller «God natt»." },
              { value: "off", label: "Uten hilsen" },
            ]}
          />
        </SettingsSection>
        <SettingsSection id="tider" title="Når delene begynner" body="Hver del varer til den neste begynner. Natten går over midnatt til morgenen.">
          <Stack gap="md">
            {PARTS.map((part, index) => (
              <TimeField key={part} name={`starts.${part}`} label={PART_LABEL[part]} value={written?.[index] ?? formatTime(settings.starts[part])} error={index === 0 ? startsError : undefined} />
            ))}
          </Stack>
        </SettingsSection>
        <SettingsSection id="helg" title="Helg" body="I helgen viser forsiden ikke jobb (issues og discussions), bare dine egne pull requests.">
          <ChoiceCards
            name="weekend"
            legend="Egen helg"
            value={settings.weekend}
            options={[
              { value: "on", label: "Ja", description: "Helgedagene under er fri for jobb." },
              { value: "off", label: "Nei", description: "Alle dager er like." },
            ]}
          />
          <CheckboxList name="weekenddays" legend="Helgedager" values={settings.weekendDays.map(String)} options={WEEKDAYS} />
        </SettingsSection>
        <SettingsSection id="vis" title="Hva forsiden viser">
          <ToggleMatrix
            legend="Deler per tid på døgnet"
            namePrefix="show"
            rows={SECTION_OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
            columns={PARTS.map((part) => ({ id: part, label: PART_LABEL[part] }))}
            values={settings.show}
            hint="Det du har slått av under Forside vises ikke, uansett tid."
          />
        </SettingsSection>
        {PARTS.map((part) => (
          <SettingsSection key={part} id={`del-${part}`} title={PART_LABEL[part]}>
            <ChoiceCards
              name={`weather.${part}`}
              legend="Været"
              value={settings.weather[part]}
              options={[
                { value: "today", label: "Resten av i dag" },
                { value: "tomorrow", label: "I morgen" },
              ]}
            />
            <ChoiceCards
              name={`pulls.${part}`}
              legend="Pull requests"
              value={settings.pulls[part]}
              options={[
                { value: "all", label: "Alle", description: "Også de som venter på review fra deg." },
                { value: "mine", label: "Bare mine" },
              ]}
            />
          </SettingsSection>
        ))}
      </SettingsForm>
    </SettingsSubpageLayout>
  )
}
