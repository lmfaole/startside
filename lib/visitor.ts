import { parseSeen, SEEN_COOKIE, type Seen } from "@lmfaole/designsystem/lib/onboarding"
import { cookies } from "next/headers"

import { BASE } from "./links"
import { formState, GITHUB_USER_COOKIE, parseLogin, type SearchParams } from "./username"

/** The visitor's GitHub username from their cookie, or `null` before they have given one: then no GitHub data is fetched. */
export async function githubUser(): Promise<string | null> {
  return parseLogin((await cookies()).get(GITHUB_USER_COOKIE)?.value)
}

/**
 * Whose GitHub data a page shows: `user`, or `null` where the page shows the form instead (no username yet, or a name just
 * written that GitHub does not have, which the form then says). `known` is the name in the cookie, to prefill the form with.
 */
export async function githubPage(searchParams: Promise<SearchParams>): Promise<{ user: string | null; known: string | null; params: SearchParams }> {
  const [params, known] = await Promise.all([searchParams, githubUser()])
  return { user: formState(params, "github").error === undefined ? known : null, known, params }
}

/** Where the `seen` cookie (the intros dismissed, the news looked at, the install offer answered) is kept: the whole app. */
export const SEEN_PATH = BASE

/** The transport page is marked new in the navigation until this day (six weeks after it came). */
export const TRANSPORT_NEW_UNTIL = "2027-01-01T00:00:00+01:00"

/** What this visitor has seen and dismissed, from the `seen` cookie. */
export async function seenNotes(): Promise<Seen> {
  return parseSeen((await cookies()).get(SEEN_COOKIE)?.value)
}
