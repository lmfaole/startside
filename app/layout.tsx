import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  )
}
