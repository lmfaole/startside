import { PullsSection } from "../../components/sections"
import { GITHUB, Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getPulls } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Pull requests · Startside" }

/** Every pull request, in groups by what needs you most: blocked, ready to merge, waiting for your review, and the rest. */
export default async function Page() {
  const instant = now()
  const pulls = await settle(getPulls("all"))
  return (
    <Shell current="github" trail={[GITHUB]} title="Pull requests" lead="Dine egne og de som venter på din review, med det som krever deg først.">
      <PullsSection data={pulls} mode="full" instant={instant} />
    </Shell>
  )
}
