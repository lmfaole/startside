import { IssuesSection } from "../../components/sections"
import { Shell } from "../../components/shell"
import { now } from "../../lib/day"
import { getIssues } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Issues · Startside" }

/** The issues that are for you, in groups: assigned to you, ones you are involved in, new ones nobody owns, and what moved lately. */
export default async function Page() {
  const instant = now()
  const issues = await settle(getIssues())
  return (
    <Shell current="issues" title="Issues" lead="Det som er tildelt deg, det du er med i, det nye som ingen eier, og det som har rørt seg.">
      <IssuesSection data={issues} mode="full" instant={instant} />
    </Shell>
  )
}
