import { Person } from "@lmfaole/designsystem/components/person"

import { avatarUrl } from "../lib/avatar"

/** A GitHub user by login, with their picture. */
export function GitHubPerson({ login }: { login: string }) {
  return <Person name={login} src={avatarUrl(login)} />
}
