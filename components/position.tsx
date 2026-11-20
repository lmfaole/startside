"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@lmfaole/designsystem/components/button"
import { Icon } from "@lmfaole/designsystem/components/icon"
import { Inline } from "@lmfaole/designsystem/components/layout"
import { Text } from "@lmfaole/designsystem/components/text"

import { formatPosition, movedFar, POSITION_COOKIE, roundPosition, type Position } from "../lib/position"

const YEAR = 60 * 60 * 24 * 365

function write(position: Position | null) {
  const value = position === null ? "" : formatPosition(position)
  document.cookie = `${POSITION_COOKIE}=${value}; path=/start; max-age=${position === null ? 0 : YEAR}; samesite=lax; secure`
}

function locate(options: PositionOptions): Promise<Position> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition((found) => resolve(roundPosition({ lat: found.coords.latitude, lon: found.coords.longitude })), reject, options),
  )
}

/**
 * The page's choice of place: the device's position, or the one in the settings. Asking happens on a tap, never on load;
 * once the browser has allowed it, the page follows the device and refreshes when it has moved a couple of hundred metres (other stations, perhaps another forecast).
 */
export function PositionControl({ current }: { current: Position | null }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Known only in the browser (Node has a `navigator` too, without `geolocation`), so the control appears once the page is hydrated.
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported("geolocation" in navigator), [])

  useEffect(() => {
    if (current === null || !("geolocation" in navigator) || !("permissions" in navigator)) return
    let cancelled = false
    navigator.permissions
      .query({ name: "geolocation" })
      .then(async (status) => {
        if (status.state !== "granted") return
        const found = await locate({ maximumAge: 10 * 60_000, timeout: 15_000 })
        if (cancelled || !movedFar(current, found)) return
        write(found)
        router.refresh()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [current, router])

  async function use() {
    setBusy(true)
    setMessage(null)
    try {
      write(await locate({ enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 15_000 }))
      router.refresh()
    } catch (error) {
      const denied = (error as GeolocationPositionError).code === 1
      setMessage(denied ? "Posisjon er ikke tillatt i nettleseren." : "Fant ikke posisjonen.")
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    write(null)
    setMessage(null)
    router.refresh()
  }

  if (!supported) return null
  return (
    <Inline gap="sm">
      {message === null ? null : (
        <Text size="xs" tone="muted">
          {message}
        </Text>
      )}
      {current === null ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={use}>
          <Icon name="place" slot="start" />
          Bruk min posisjon
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={busy} onClick={reset}>
          <Icon name="home" slot="start" />
          Bruk standardsted
        </Button>
      )}
    </Inline>
  )
}
