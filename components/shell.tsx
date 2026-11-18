import { Breadcrumbs } from "@lmfaole/designsystem/components/breadcrumbs"
import { NavBar } from "@lmfaole/designsystem/components/nav-bar"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import type { ReactNode } from "react"

import { withBase } from "../lib/links"
import { Refresh } from "./refresh"

/** How often the open page asks for itself again (components/refresh.tsx); GitHub is cached for as long, so each ask sees fresh lists. */
const REFRESH_SECONDS = 60

export type PageId = "front" | "pull-requests" | "issues" | "discussions" | "weather"

/** The top-level places: one-word labels, the same order on every page. */
const PLACES = [
  { key: "front", label: "Forside", path: "", icon: "home" },
  { key: "pull-requests", label: "PR-er", path: "/pull-requests", icon: "pull-request" },
  { key: "issues", label: "Issues", path: "/issues", icon: "issue" },
  { key: "discussions", label: "Diskusjoner", path: "/discussions", icon: "discussion" },
  { key: "weather", label: "Vær", path: "/vaer", icon: "weather" },
] as const

/**
 * The frame of every page: the navigation between the places (a bar at the foot on a phone, a rail at the left from tablet width),
 * the title, and on a detail page the way back to the list it belongs to. `current` is the place the page is in; for a detail page,
 * the list it belongs to.
 */
export function Shell({ current, back, crumb, title, lead, actions, children }: { current: PageId; /** On a detail page: the list it belongs to; the breadcrumbs are the front page, that list and the page itself. */ back?: { path: string; label: string }; /** The page's name in the breadcrumbs when the title is long (a pull request's title): `#6851`. */ crumb?: string; title: string; lead?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <PageLayout nav={<NavBar label="Hovedmeny" title="Startside" items={PLACES.map((place) => ({ key: place.key, label: place.label, href: withBase(place.path), icon: place.icon, current: place.key === current }))} />}>
      <Refresh everySeconds={REFRESH_SECONDS} />
      {back === undefined ? null : <Breadcrumbs items={[{ label: "Startside", href: withBase("") }, { label: back.label, href: withBase(back.path) }, { label: crumb ?? title, href: "#" }]} />}
      <PageHeader title={title} lead={lead} actions={actions} />
      {children}
    </PageLayout>
  )
}
