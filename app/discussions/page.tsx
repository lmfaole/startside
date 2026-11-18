import { DiscussionsSection } from "../../components/sections"
import { Shell } from "../../components/shell"
import { getDiscussions } from "../../lib/github"
import { settle } from "../../lib/settle"

export const dynamic = "force-dynamic"
export const metadata = { title: "Discussions · Startside" }

/** The discussions of the watched repositories, in groups: the ones you are in, the unanswered questions, and what moved lately. */
export default async function Page() {
  const discussions = await settle(getDiscussions())
  return (
    <Shell current="discussions" title="Discussions" lead="Samtalene du er med i, spørsmål uten svar, og det som har rørt seg.">
      <DiscussionsSection data={discussions} mode="full" />
    </Shell>
  )
}
