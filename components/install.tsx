"use client"

import { useEffect, useState } from "react"

import { Button } from "@lmfaole/designsystem/components/button"
import { Text } from "@lmfaole/designsystem/components/text"

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type State = { kind: "none" } | { kind: "prompt"; event: InstallPrompt } | { kind: "ios" }

/**
 * Registers the service worker, and offers to install the page as an app: a button where the browser lets a page ask
 * (Chrome, Edge, Android), a hint on iPhone and iPad, where only the share menu can; nothing once it is installed.
 */
export function Install() {
  const [state, setState] = useState<State>({ kind: "none" })

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/start/sw.js", { scope: "/start" }).catch(() => {})

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
    if (standalone) return
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setState({ kind: "ios" })
      return
    }
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setState({ kind: "prompt", event: event as InstallPrompt })
    }
    const onInstalled = () => setState({ kind: "none" })
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (state.kind === "ios") {
    return (
      <Text size="sm" tone="muted">
        Installer: Del → Legg til på Hjem-skjerm
      </Text>
    )
  }
  if (state.kind === "prompt") {
    return (
      <Button
        variant="outline"
        onClick={async () => {
          await state.event.prompt()
          await state.event.userChoice
          setState({ kind: "none" })
        }}
      >
        Installer som app
      </Button>
    )
  }
  return null
}
