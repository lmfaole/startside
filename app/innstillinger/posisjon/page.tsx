import { cookies } from "next/headers"

import { PositionControl } from "../../../components/position"
import { settingsFields } from "../../../components/settings-fields"
import { SettingsSubpageLayout } from "../../../components/settings-subpage"
import { parsePosition, POSITION_COOKIE } from "../../../lib/position"
import type { SearchParams } from "../../../lib/username"
import { settingsState } from "../../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Posisjon · Innstillinger · Startside" }

/** The position: shared from its own button and kept at once (no form), or the default place. */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, state, position] = await Promise.all([searchParams, settingsState(), cookies().then((jar) => parsePosition(jar.get(POSITION_COOKIE)?.value))])
  return (
    <SettingsSubpageLayout title="Posisjon" lead="Gir avganger fra holdeplassene nær deg og været der du er. Lagres med en gang du deler den." params={params} problems={state.problems}>
      {settingsFields({ ...state, position }).position}
      {position === null ? null : <PositionControl current={position} />}
    </SettingsSubpageLayout>
  )
}
