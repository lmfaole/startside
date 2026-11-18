import { getCloudflareContext } from "@opennextjs/cloudflare"

/** A variable or secret: from the Worker's bindings when deployed, from the process environment in `next dev`. */
export function env(name: string): string | undefined {
  try {
    const value = (getCloudflareContext().env as unknown as Record<string, unknown>)[name]
    if (typeof value === "string" && value !== "") return value
  } catch {
    // Not running in a Worker.
  }
  return process.env[name] || undefined
}
