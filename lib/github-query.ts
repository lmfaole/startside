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

/** The watched repositories (`GITHUB_WATCH_REPOS`, comma-separated `owner/name`); anything that is not `owner/name` is dropped. */
export function parseRepos(repos: string | undefined): string[] {
  return (repos ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/.test(repo))
}

/** The watched repositories as search qualifiers: GitHub reads several `repo:` as "any of them". */
export function repoQualifiers(repos: string | undefined): string {
  return parseRepos(repos).map((repo) => `repo:${repo}`).join(" ")
}

/** Whether a repository (`owner/name`, any case) is one of the watched; with none watched, every one is. */
export function isWatched(repo: string, repos: string | undefined): boolean {
  const watched = parseRepos(repos).map((name) => name.toLowerCase())
  return watched.length === 0 || watched.includes(repo.toLowerCase())
}
