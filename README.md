# startside

A personal start page: what to do and look at during the working day, fetched from outside services and rendered on the
server on every request. Next.js (App Router, SSR) on Cloudflare Workers through OpenNext, built from the components of
[`lmfaole/designsystem`](https://github.com/lmfaole/designsystem). The project writes no styling of its own.

## Sources

| Source | What | Config |
| --- | --- | --- |
| Yr (MET Norway `locationforecast`) | The forecast for the rest of the day | `WEATHER_PLACE`, `WEATHER_LAT`, `WEATHER_LON` in `wrangler.jsonc` |
| GitHub | Pull requests awaiting your review, your open pull requests, issues assigned to you | secret `GITHUB_TOKEN` on `startside-upstream` |

GitHub is limited to public repositories, and can leave out organisations with `GITHUB_EXCLUDE_ORGS` (comma-separated, in
`wrangler.jsonc`; none now): `lib/github-query.ts`.

Pull requests are in sections by what needs you most (`lib/pulls.ts`), empty ones left out: **Blokkert, krever deg** (yours:
red checks, conflicts, changes asked for, open conversations), **Klar til merge** (approved and green), **Venter på din
review** (oldest first, with how long it has waited and how big it is), **Venter på andre**, **Ikke klar for review**
(drafts and red ones waiting for you), **Dine utkast**, and **Dine åpne** (the ones GitHub gave no status for). Pull requests
also show their status (draft, checks, review decision, conflicts, open conversations; `lib/pr-status.ts`).
The list comes from the search and the status from GitHub's GraphQL (one call for all of them, through the relay, which
allows POST only to `api.github.com/graphql`). An organisation can allow the one and block the other (SpareBank 1 blocks
GraphQL for fine-grained tokens that live longer than 366 days), so the list never depends on it: what GraphQL could not
read is shown without a status.

A source that fails shows its own error and does not take the page down.

## Time of day

The page follows the time of day in Oslo (`lib/day.ts`, the plan in `lib/plan.ts`):

| | Greeting | Shown, in order | Forecast |
| --- | --- | --- | --- |
| Morning 05–09 | God morgen | weather, pull requests (reviews and own), assigned issues | rest of today |
| Workday 09–16 | God dag | pull requests (reviews and own), assigned issues, weather | rest of today |
| Evening 16–22 | God kveld | own pull requests, weather | tomorrow |
| Night 22–05 | God natt | weather | tomorrow |
| Weekend | as above | weather, own pull requests (night: weather) | today by day, tomorrow in the evening |

Before 05:00 it is still the day before, so the night after Friday is a weekday and the night after Sunday a weekend.
What is not shown is not fetched. In `next dev`, `NOW=2026-11-18T07:00:00+01:00 npm run dev` stands in for the clock;
it is never read in production. `npm test` covers the parts of the day, their edges, the clocks changing and the forecast windows.

## Issues

Issues are a `SectionGroup` too (`lib/issues.ts`), in the order of what is for you: **Tildelt deg** (any public repository),
**Du er involvert i** (the watched repositories), **Nye uten eier** (made in the last week, nobody on it) and **Nylig aktive**
(what moved lately). An issue is in the first group it belongs to, at most ten each. The watched repositories are
`GITHUB_WATCH_REPOS` in `wrangler.jsonc` (comma-separated `owner/name`; `fremtind/jokul` now). Shown in the morning and
the workday, not in the evening or the weekend. 

**Discussions** (`lib/discussions.ts`, GraphQL only) in the watched repositories, morning and workday: **Du er med i** and
**Ubesvarte**, at most ten each; nothing is shown where there are none.

Searching on `repo:` or `org:` is blocked for the token by SpareBank 1's SAML single sign-on, while reading the repository
itself is not. So «Du er involvert i» searches by you (`involves:@me`) and is filtered to the watched repositories, and
the repositories' own issues (for «Nye uten eier» and «Nylig aktive») and discussions are read straight from them
(`/repos/{repo}/issues`, GraphQL `repository(...)`). `GITHUB_TOKEN` must live 366 days or less (SpareBank 1 blocks GraphQL
and direct reads for longer ones).

**Discussions** (`lib/discussions.ts`, GraphQL only) in the watched repositories, morning and workday: **Du er med i**,
**Ubesvarte spørsmål** (only categories with answers can be unanswered) and **Nylig aktive**, at most ten each.

## Live updates

An open page keeps itself fresh (`components/refresh.tsx`): every 60 seconds, and at once when the window comes back into view
after more than half that, it asks the server for the page again (`router.refresh()`), so the lists, the weather and the
time of day change without a reload and without losing the page's state. Nothing runs while the window is hidden or the
device is offline. «oppdatert 19:27» under the title is when the server last built the page. If the Access session has
run out, the refresh ends at the login, as a reload would. The pull requests are one `SectionGroup` of the design system
(5.1), so the grid places them as one part.

## Position

«Bruk min posisjon» (next to the title) asks the browser for the device's position, on a tap and never on load. The position
is kept in the cookie `startside-pos` (`lat,lon`, two decimals, about a kilometre, path `/start`, a year) and read by the
server, which fetches the forecast for it and names the place (OpenStreetMap's Nominatim, through the relay, cached for a
day). Once the browser has allowed it, the page follows the device and refreshes when it has moved about two kilometres.
«Bruk standardsted» removes the cookie and goes back to `WEATHER_*`. The position is used for the forecast only; GitHub and
the rest do not see it. `lib/position.ts` is tested.

## How it runs

- **`startside`** (`worker.mjs`, `wrangler.jsonc`): the page, on the route `lmfaole.party/start*`. The static files are
  embedded in the script (`scripts/embed-assets.mjs`), so a deploy is one upload.
- **`startside-upstream`** (`upstream/`): a relay on workers.dev. A Worker on the `lmfaole.party` zone gets 525 on every
  fetch to an origin outside Cloudflare, while workers.dev works, so the page fetches Yr and GitHub through it. It takes
  only GET, only those hosts (Yr, GitHub, Nominatim), and only with the shared secret `UPSTREAM_KEY` (set on both Workers). It holds `GITHUB_TOKEN`.

In `next dev` there is no `UPSTREAM_URL`, so the page fetches the sources directly.

Served at `lmfaole.party/start` through a Cloudflare route (`wrangler.jsonc`), with `basePath: "/start"` in `next.config.ts`.

## App

The page installs as an app (PWA): `app/manifest.ts`, the icons (`public/icons`, `app/icon.png`, `app/apple-icon.png`,
drawn by `scripts/icons.mjs`; the manifest colours are the dark background, since Android colours the system bars from the manifest, which has one colour), and a service worker (`app/sw.js/route.ts`) that keeps the built files and the last copy
of the page, so it opens without network (registered by `components/service-worker.tsx`). Installing is the browser's own
(the install icon in the address bar, «Legg til på Hjem-skjerm»). The manifest and icons are outside Cloudflare Access (the application «Startside –
app-filer», a bypass policy), since browsers fetch them without the login cookie.

## Deploy

`.github/workflows/deploy.yml` builds and type-checks every push. On the default branch it also deploys both Workers,
once the repository has the secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit, Workers Routes: Edit on `lmfaole.party`)
and `CLOUDFLARE_ACCOUNT_ID`; without them the run only builds. `npm run deploy` deploys the page from a machine.

Secrets on the Workers, set with `wrangler secret put` or in the dashboard as **Secret** (not as text):

| Worker | Secret |
| --- | --- |
| `startside` | `UPSTREAM_KEY` |
| `startside-upstream` | `UPSTREAM_KEY` (the same), `GITHUB_TOKEN` (read access to pull requests and issues) |

## Develop

```sh
cp .dev.vars.example .dev.vars   # add GITHUB_TOKEN (or export it)
npm run dev
npm run preview                  # the Worker build, locally
npm run deploy
wrangler secret put GITHUB_TOKEN
```

The page shows personal data, so `lmfaole.party/start` is behind Cloudflare Access (the application «Startside»): only the owner's address gets in, with a login code by e-mail.

## Add a source

One file in `lib/` that fetches and shapes the data, one async server component in `app/page.tsx` that renders it with
the design system's components, wrapped so a failure stays in its own section.
