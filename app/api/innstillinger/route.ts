import { addSeen, SEEN_COOKIE, seenCookieString } from "@lmfaole/designsystem/lib/onboarding"
import { parsePrefs, PREFS_COOKIE, prefsCookieString, serializePrefs } from "@lmfaole/designsystem/lib/preferences"
import { cookies } from "next/headers"

import { DAY_COOKIE, dayCookieString, parseDaySettings, readDayForm, serializeDaySettings } from "../../../lib/day-settings"
import { githubLogin, publicRepo } from "../../../lib/github-check"
import { BASE } from "../../../lib/links"
import { SECTIONS } from "../../../lib/plan"
import { applyMove, parseOrder, readOrder, sectionOrder, withOrder } from "../../../lib/section-order"
import { backWith, checkSettings, FIRST_RUN, firstStep, mergeChoices, problemsCookie, readSettingsForm, refererPath, reposCookie, SETTINGS_PAGE, withoutSeen, type Problems } from "../../../lib/settings"
import { safeBack, userCookie } from "../../../lib/username"

const go = (location: string, setCookies: string[]): Response => {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" })
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie)
  return new Response(null, { status: 303, headers })
}

/**
 * The first-run wizard's and the settings page's endpoint, one plain form (no JavaScript needed). `validate=<step>` checks the step's
 * fields and answers `{ errors }` as JSON, keeping nothing (the wizard with JavaScript, before «Neste»). Otherwise it keeps what is
 * valid (`prefs`, `github_user`, `github_repos`), marks the wizard seen and goes back; what GitHub did not have goes back to the form
 * (`innstillinger-feil`, a couple of minutes), at the wizard's step. `skip=1` only marks it seen; `rerun=1` («Vis introen igjen») unmarks it.
 * The page to go back to is `back`, or, from the wizard (drawn on any page), the page it was sent from.
 *
 * The front page's order: `order` (comma ids) is kept in `prefs` (`order=`). `move=<id>:up|down` (the reorder list's buttons without
 * JavaScript) moves the section in the submitted `order` (or the saved one), keeps only that and goes back to the settings page's
 * `#rekkefolge`. The time of day (`startside_day`, lib/day-settings.ts) is only touched when the form has `day=1`, so the wizard leaves it
 * be: `mode`, `greeting`, `starts.<part>`, `weekend`, `weekenddays`, `show.<part>`, `weather.<part>`, `pulls.<part>` (`readDayForm`).
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => new FormData())
  const jar = await cookies()
  const written = form.get("back")
  const back = safeBack(typeof written === "string" && written !== "" ? written : refererPath(request.headers.get("referer"), new URL(request.url).origin))
  const seen = jar.get(SEEN_COOKIE)?.value
  const read = readSettingsForm(form)
  const prefsValue = jar.get(PREFS_COOKIE)?.value
  const writtenOrder = readOrder(form.get("order"))
  const order = sectionOrder(SECTIONS, writtenOrder ?? parseOrder(prefsValue))
  const move = form.get("move")
  if (typeof move === "string" && move !== "") {
    return go(`${SETTINGS_PAGE}#rekkefolge`, [prefsCookieString(withOrder(serializePrefs(parsePrefs(prefsValue)), applyMove(order, move)), BASE)])
  }

  if (read.rerun) return go(backWith(back), [seenCookieString(withoutSeen(seen, FIRST_RUN), BASE), problemsCookie(null)])
  if (read.skip) return go(backWith(back), [seenCookieString(addSeen(seen, FIRST_RUN), BASE), problemsCookie(null)])

  const checked = await checkSettings(read, { user: githubLogin, publicRepo })
  const day = form.get("day") === "1" ? readDayForm(form, parseDaySettings(jar.get(DAY_COOKIE)?.value)) : undefined
  if (day?.errors.starts !== undefined) checked.errors.starts = day.errors.starts
  if (read.validate !== undefined) return Response.json({ errors: checked.errors }, { headers: { "Cache-Control": "no-store" } })

  const prefs = serializePrefs(mergeChoices(parsePrefs(prefsValue), read))
  const kept = [prefsCookieString(withOrder(prefs, writtenOrder === undefined ? parseOrder(prefsValue) : order), BASE)]
  if (day !== undefined) kept.push(dayCookieString(serializeDaySettings(day.settings), BASE))
  if (checked.github !== undefined) kept.push(userCookie(checked.github))
  if (checked.repos !== undefined) kept.push(reposCookie(checked.repos))

  const step = firstStep(checked.errors)
  if (step !== undefined) {
    const problems: Problems = {
      ...(read.fromWizard ? { step } : {}),
      errors: checked.errors,
      values: {
        ...(checked.errors.github === undefined ? {} : { github: read.github }),
        ...(checked.errors.repos === undefined ? {} : { repos: read.repos?.join("\n") }),
        ...(checked.errors.starts === undefined ? {} : { starts: day?.written.starts }),
      },
    }
    return go(read.fromWizard ? backWith(back, { step }) : `${backWith(back)}#${step}`, [...kept, problemsCookie(problems)])
  }
  return go(read.fromWizard ? backWith(back) : backWith(back, { saved: true }), [...kept, seenCookieString(addSeen(seen, FIRST_RUN), BASE), problemsCookie(null)])
}
