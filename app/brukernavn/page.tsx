import { GithubUserForm } from "../../components/github-user"
import { Shell } from "../../components/shell"
import { safeBack, type SearchParams } from "../../lib/username"
import { githubUser } from "../../lib/visitor"

export const dynamic = "force-dynamic"
export const metadata = { title: "GitHub-brukernavn · Startside" }

/** Where «Bytt» leads: the form by itself, prefilled with the name in use. Empty, it forgets the name. */
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const tilbake = Array.isArray(params["tilbake"]) ? params["tilbake"][0] : params["tilbake"]
  const current = await githubUser()
  return (
    <Shell current="front" trail={[]} title="GitHub-brukernavn" lead="Hvilken GitHub-bruker startsiden henter data for. La feltet stå tomt for å glemme navnet.">
      <GithubUserForm back={safeBack(tilbake)} params={params} current={current ?? undefined} />
    </Shell>
  )
}
