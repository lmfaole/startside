import { AlertsSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getCiFailures, getDependabot, getReplies } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Varsler · Startside" }

/** What wants a look: repositories whose default branch is red, replies and reviews from others on what you are in, and Dependabot's open pull requests. */
export default async function Page() {
  const instant = now()
  const [ci, replies, dependabot] = await Promise.all([settle(getCiFailures()), settle(getReplies(instant)), settle(getDependabot())])
  return (
    <Shell current="github" trail={[GITHUB]} title="Varsler" lead="Det som er rødt, det som er nytt fra andre, og det Dependabot venter på.">
      <AlertsSection data={{ ci, replies, dependabot }} mode="full" instant={instant} />
    </Shell>
  )
}
