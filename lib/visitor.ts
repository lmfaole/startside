import { cookies } from "next/headers"

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
