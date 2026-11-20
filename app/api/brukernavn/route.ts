import { env, mocking } from "../../../lib/env"
import { upstream } from "../../../lib/upstream"
import { parseLogin, safeBack, userCookie, withError } from "../../../lib/username"

/** The login as GitHub writes it, or `null` where there is no such user: asked with the server's token (through the relay, which adds it). */
async function githubLogin(login: string): Promise<string | null> {
  if (mocking()) return login
  const token = env("GITHUB_TOKEN")
  const response = await upstream(`https://api.github.com/users/${login}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/vnd.github+json", "User-Agent": "startside", "X-GitHub-Api-Version": "2022-11-28" },
    revalidate: 3600,
  })
  if (!response.ok) return null
  const user = (await response.json()) as { login?: unknown; type?: unknown }
  return user.type === "User" ? parseLogin(user.login) : null
}

const redirect = (location: string, cookie?: string): Response =>
  new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", ...(cookie === undefined ? {} : { "Set-Cookie": cookie }) } })

/**
 * The username form's endpoint (a plain form, no JavaScript): checks that GitHub has the user, keeps the name in the `github_user`
 * cookie and goes back to the page. An empty field forgets the name; an unknown one goes back with the error for the form to show.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => new FormData())
  const back = safeBack(form.get("back"))
  const written = form.get("github")
  if (typeof written !== "string") return redirect(back)
  if (written.trim() === "") return redirect(back, userCookie(null))
  const login = parseLogin(written)
  const found = login === null ? null : await githubLogin(login).catch(() => null)
  return found === null ? redirect(withError(back, "github", written.trim())) : redirect(back, userCookie(found))
}
