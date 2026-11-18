"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@lmfaole/designsystem/components/button"
import { Icon } from "@lmfaole/designsystem/components/icon"
import { Inline } from "@lmfaole/designsystem/components/layout"
import { Text } from "@lmfaole/designsystem/components/text"

import { formatHome, HOME_COOKIE } from "../lib/places"

const YEAR = 60 * 60 * 24 * 365

function write(value: string | null) {
  document.cookie = `${HOME_COOKIE}=${value ?? ""}; path=/start; max-age=${value === null ? 0 : YEAR}; samesite=lax; secure`
}

/** Home is where the device is when it is asked to be: the position is kept in a cookie in this browser, never anywhere else, and only to find the way and the stops. */
export function HomeControl({ isSet }: { isSet: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported("geolocation" in navigator), [])

  function use() {
    setBusy(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      (found) => {
        write(formatHome({ lat: found.coords.latitude, lon: found.coords.longitude }))
        setBusy(false)
        router.refresh()
      },
      (error) => {
        setMessage(error.code === 1 ? "Posisjon er ikke tillatt i nettleseren." : "Fant ikke posisjonen.")
        setBusy(false)
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
    )
  }

  if (!supported) return null
  return (
    <Inline gap="sm">
      {message === null ? null : (
        <Text size="xs" tone="muted">
          {message}
        </Text>
      )}
      {isSet ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            write(null)
            router.refresh()
          }}
        >
          <Icon name="remove" slot="start" />
          Fjern hjemstedet
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={busy} onClick={use}>
          <Icon name="home" slot="start" />
          Her er hjemme
        </Button>
      )}
    </Inline>
  )
}
