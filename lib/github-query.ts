/**
 * What every search is limited to: public repositories only, and not the organisations listed (`GITHUB_EXCLUDE_ORGS`,
 * comma-separated; `fremtind` is SpareBank 1's, which blocks the token and which the page never shows).
 */
export function scope(excludeOrgs: string | undefined): string {
  const orgs = (excludeOrgs ?? "")
    .split(",")
    .map((org) => org.trim())
    .filter((org) => /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(org))
  return ["is:public", ...orgs.map((org) => `-org:${org}`)].join(" ")
}
