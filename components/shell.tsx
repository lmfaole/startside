import { BackLink } from "@lmfaole/designsystem/components/back-link"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { PageTabs } from "@lmfaole/designsystem/components/page-tabs"
import type { ReactNode } from "react"

import { withBase } from "../lib/links"
import { Refresh } from "./refresh"

/** How often the open page asks for itself again (components/refresh.tsx); GitHub is cached for as long, so each ask sees fresh lists. */
const REFRESH_SECONDS = 60

export type PageId = "front" | "pull-requests" | "issues" | "discussions" | "weather"

const TABS = [
  { key: "front", label: "Forside", path: "", icon: "home" },
  { key: "pull-requests", label: "Pull requests", path: "/pull-requests", icon: "pull-request" },
  { key: "issues", label: "Issues", path: "/issues", icon: "issue" },
  { key: "discussions", label: "Discussions", path: "/discussions", icon: "discussion" },
  { key: "weather", label: "Vær", path: "/vaer", icon: "weather" },
] as const

/**
 * The frame of every page: the title, and above the content either the tabs between the sibling pages (the front page and its
 * lists) or, on a detail page, the way back to the list it belongs to. The same tabs in the same order on every page of the set.
 */
export function Shell({ current, back, title, lead, actions, children }: { current?: PageId; back?: { path: string; label: string }; title: string; lead?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <PageLayout>
      <Refresh everySeconds={REFRESH_SECONDS} />
      {back === undefined ? null : <BackLink href={withBase(back.path)} label={back.label} />}
      <PageHeader title={title} lead={lead} actions={actions} />
      {back !== undefined ? null : <PageTabs label="Sider" tabs={TABS.map((tab) => ({ key: tab.key, label: tab.label, href: withBase(tab.path === "" ? "" : tab.path) || "/start", icon: tab.icon, current: tab.key === current }))} />}
      {children}
    </PageLayout>
  )
}
