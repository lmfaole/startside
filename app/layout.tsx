import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"

import { htmlAttributes } from "@lmfaole/designsystem/lib/preferences"

import { visitorPrefs } from "../lib/visitor"
import { ServiceWorker } from "../components/service-worker"
import "./globals.css"

export const metadata: Metadata = {
  title: "Startside",
  applicationName: "Startside",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Start", statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

// The design system's background, light and dark (--background in theme.css), for the browser's and the app's bar.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  viewportFit: "cover",
}

// The visitor's theme and effects (the `prefs` cookie, chosen in the wizard or under Innstillinger) are on <html> from the first frame.
export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" {...htmlAttributes(await visitorPrefs())}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
