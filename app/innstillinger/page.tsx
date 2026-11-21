import { Banner } from "@lmfaole/designsystem/components/banner"
import { FormErrorSummary } from "@lmfaole/designsystem/components/form-error-summary"
import { Stack } from "@lmfaole/designsystem/components/layout"
import { SettingsSection } from "@lmfaole/designsystem/components/settings-section"
import { SubPages } from "@lmfaole/designsystem/components/sub-pages"
import { orderSections } from "@lmfaole/designsystem/lib/preferences"
import { cookies } from "next/headers"

import { Credits } from "../../components/credits"
import { IntroAgain } from "../../components/intro-again"
import { OldSettingsAnchor } from "../../components/old-settings-anchor"
import { Shell } from "../../components/shell"
import { daySummary } from "../../lib/day-settings"
import { SECTIONS } from "../../lib/plan"
import { parsePosition, POSITION_COOKIE } from "../../lib/position"
import { appearanceSummary, parseReposCookie, REPOS_COOKIE, reposSummary, sectionsSummary, settingsPage } from "../../lib/settings"
import type { SearchParams } from "../../lib/username"
import { settingsState, visitorDaySettings } from "../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Innstillinger · Startside" }

/**
 * The settings' overview: one row per subpage with what is chosen there now, «Vis introen igjen», and at the bottom where the data comes from (`Credits`). Each subpage has its
 * own small form to the settings endpoint. «Lagret» here is for a save that came back to the overview (an older form).
 */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state, day, jar] = await Promise.all([searchParams, settingsState(), visitorDaySettings(), cookies()])
  const position = parsePosition(jar.get(POSITION_COOKIE)?.value)
  const errors = Object.entries(state.problems?.errors ?? {}).map(([field, message]) => ({ field, message: String(message) }))
  return (
    <Shell current="settings" firstRun={false} title="Innstillinger" lead="Hvem startsiden henter data for, hva den viser og hvordan den ser ut. Alt lagres i informasjonskapsler i denne nettleseren.">
      <OldSettingsAnchor />
      <Stack gap="xl">
        {params["lagret"] === "1" && errors.length === 0 ? <Banner tone="success" title="Lagret">Endringen gjelder fra nå av i denne nettleseren.</Banner> : null}
        {errors.length === 0 ? null : <FormErrorSummary errors={errors} />}
        <SubPages
          label="Innstillinger"
          pages={[
            { href: settingsPage("konto"), label: "Konto", icon: "person", value: state.user ?? "Ikke valgt", description: "GitHub-brukeren startsiden henter offentlige data for." },
            { href: settingsPage("repoer"), label: "Repoer", icon: "repository", value: reposSummary(parseReposCookie(jar.get(REPOS_COOKIE)?.value)), description: "Repoene du følger, også der du ikke selv er med." },
            { href: settingsPage("forside"), label: "Forside", icon: "home", value: sectionsSummary(orderSections(SECTIONS, state.prefs.order), state.prefs.sections), description: "Hvilke deler forsiden viser, og i hvilken rekkefølge." },
            { href: settingsPage("tid"), label: "Tid på døgnet", icon: "time", value: daySummary(day), description: "Hva forsiden viser om morgenen, på jobb, om kvelden og i helgen." },
            { href: settingsPage("posisjon"), label: "Posisjon", icon: "place", value: position === null ? "Standardsted" : "Delt", description: "Avganger og vær der du er." },
            { href: settingsPage("utseende"), label: "Utseende", icon: "sun", value: appearanceSummary(state.prefs), description: "Tema, effekter og lyset." },
            { href: settingsPage("app"), label: "App", icon: "device", description: "Legg startsiden på hjemskjermen." },
          ]}
        />
        <SettingsSection id="intro" title="Introen" body="Gå gjennom de første valgene igjen, ett om gangen.">
          <IntroAgain />
        </SettingsSection>
        <SettingsSection id="kilder" title="Kilder" body="Hvor dataene kommer fra. Ingenting lagres; hver side spør kildene når den åpnes, og svarene holdes en kort stund.">
          <Credits />
        </SettingsSection>
      </Stack>
    </Shell>
  )
}
