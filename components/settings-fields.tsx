import { CheckboxList } from "@lmfaole/designsystem/components/checkbox-list"
import { ChoiceCards } from "@lmfaole/designsystem/components/choice-cards"
import { EffectsPreview } from "@lmfaole/designsystem/components/effects-preview"
import { ListField } from "@lmfaole/designsystem/components/list-field"
import { Text } from "@lmfaole/designsystem/components/text"
import { TextField } from "@lmfaole/designsystem/components/text-field"
import { ThemeSample } from "@lmfaole/designsystem/components/theme-sample"
import { TiltPreview } from "@lmfaole/designsystem/components/tilt-preview"
import type { Prefs } from "@lmfaole/designsystem/lib/preferences"
import type { ReactNode } from "react"

import { formatPosition, type Position } from "../lib/position"
import { MAX_REPOS, SECTION_OPTIONS, type Problems } from "../lib/settings"
import { PositionPermission } from "./position"

export type SettingsState = { user: string | null; repos: string[]; prefs: Prefs; problems: Problems | null; position: Position | null }

/**
 * The fields the first-run wizard and the settings page share, one per choice, each as it was chosen (or the suggestion), with what
 * the server said about a failed submission. Plain form fields: the same form posts them all to the settings endpoint.
 */
export function settingsFields({ user, repos, prefs, problems, position }: SettingsState): Record<"github" | "repos" | "position" | "sections" | "theme" | "effects" | "tilt", ReactNode> {
  return {
    github: (
      <TextField
        label="GitHub-brukernavn"
        name="github"
        hint="Bare offentlige data hentes. La feltet stå tomt for å ikke vise GitHub."
        error={problems?.errors.github}
        defaultValue={problems?.values.github ?? user ?? ""}
        autoComplete="username"
        placeholder="octocat"
        optional
        verbatim
      />
    ),
    repos: (
      <ListField
        label="Repoer du følger"
        name="repos"
        values={problems?.values.repos === undefined ? repos : problems.values.repos.split("\n")}
        hint={`Ett per linje, som eier/navn. Bare offentlige repoer, høyst ${MAX_REPOS}. Nye issues og discussions derfra vises på forsiden.`}
        error={problems?.errors.repos}
        placeholder="vercel/next.js"
        optional
      />
    ),
    position: (
      <>
        <PositionPermission
          current={position}
          title="Avganger og vær der du er"
          body="Del posisjonen for å finne holdeplassene nærmest deg og været der du er. Den rundes av og lagres bare i en informasjonskapsel i denne nettleseren."
          fallback={<Text tone="muted">Uten posisjon brukes standardstedet. Du kan dele den senere fra Transport eller Vær.</Text>}
        />
        {position === null ? null : <Text tone="muted">Posisjonen din er delt ({formatPosition(position)}). Du kan oppdatere den fra Transport eller Vær.</Text>}
      </>
    ),
    sections: (
      <>
        <input type="hidden" name="sections-shown" value="1" />
        <CheckboxList name="sections" legend="Vis på forsiden" values={prefs.sections ?? SECTION_OPTIONS.map((option) => option.value)} options={SECTION_OPTIONS} hint="Forsiden viser dem når de passer tiden på døgnet." />
      </>
    ),
    theme: (
      <ChoiceCards
        name="theme"
        legend="Tema"
        value={prefs.theme}
        options={[
          { value: "system", label: "Som enheten", description: "Lyst om dagen og mørkt om kvelden, som enheten er stilt inn.", icon: "settings", preview: <ThemeSample theme="system" /> },
          { value: "light", label: "Lyst", icon: "sun", preview: <ThemeSample theme="light" /> },
          { value: "dark", label: "Mørkt", icon: "moon", preview: <ThemeSample theme="dark" /> },
        ]}
      />
    ),
    effects: (
      <>
        <ChoiceCards
          name="effects"
          legend="Effekter"
          value={prefs.effects}
          options={[
            { value: "on", label: "På", description: "Bakgrunnen og bildene tegnes i 3D og følger lyset." },
            { value: "off", label: "Av", description: "Flatt og stille. Bruker mindre strøm." },
          ]}
        />
        <EffectsPreview name="effects" value={prefs.effects} />
      </>
    ),
    tilt: (
      <>
        <ChoiceCards
          name="tilt"
          legend="Lyset følger telefonen"
          value={prefs.tilt}
          options={[
            { value: "on", label: "På", description: "Vipp telefonen, så flytter lyset seg." },
            { value: "off", label: "Av", description: "Lyset står stille." },
          ]}
        />
        <TiltPreview name="tilt" />
      </>
    ),
  }
}
