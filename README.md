# startside

A personal start page: what to do and look at during the working day, fetched from outside services and rendered on the
server on every request. Next.js (App Router, SSR) on Cloudflare Workers through OpenNext, built from the components of
[`lmfaole/designsystem`](https://github.com/lmfaole/designsystem). The project writes no styling of its own.

## Pages

Built after the design system's «Pages and navigation» rules (5.3): three levels, internal links first.

| Page | Is |
| --- | --- |
| `/start` | The **digest**: the few things that need you most from each source, each section a card whose foot leads on to its page («Se alle pull requests», with how many there are; `PageSection continues`), each GitHub section with its own counts (`SummaryBar`, each a link to its group) under its title. Follows the time of day (`lib/plan.ts`). |
| `/start/pull-requests`, `/issues`, `/discussions` | The **lists**: everything, in groups by what needs you most. Discussions are under Issues (the bar holds five places) |
| `/start/github` | GitHub in one place: a card for each part (varsler, pull requests, issues, discussions) with its counts, its foot the link to its page («Se alle issues»), which have GitHub as their first breadcrumb |
| `/start/transport` | The stations nearest to the device (Entur, within a kilometre, nearest first), each with a departure board (`DepartureBoard`): line, destination, platform, delays and cancellations. Only from the device's position («Bruk min posisjon»); without it the page says so. `/start/avganger` redirects here (`next.config.ts`) |
| `/start/varsler` | What wants a look: **feilende CI** (a default branch whose last commit is red, in the user's public repositories and the watched ones), **nytt fra andre** (replies and reviews on what the user is in, last three days, where somebody else wrote last) and **Dependabot** (its open pull requests in the user's public repositories, with their checks). Only when the username is the token's owner (see below) |
| `/start/innstillinger` | **Innstillinger** (last in the menu): an overview (`SubPages` with what is chosen now) of the subpages `konto` (GitHub username, the only place it is shown; and where `/start/brukernavn` redirects), `repoer`, `forside` (sections and their order), `tid` (time of day: the switch and greeting, with its own subpages `tid/deler`, `tid/helg`, `tid/innhold` and one per part, `tid/morgen` … `tid/natt`), `posisjon`, `utseende` (theme, effects, tilt) and `app` (install, «Vis introen igjen»), each with its own small form; «Vis introen igjen» also at the bottom of the overview |
| `/start/vaer` | The whole forecast: the rest of today, tomorrow, the coming days |
| `/start/pull-requests/{owner}/{repo}/{n}`, `/issues/…`, `/discussions/…` | The **detail** of one thing: status, description, facts, checks, last comments, and **«Åpne på GitHub» last** |

The navigation between the places is the design system's `NavBar` (a bar at the foot on a phone, a rail at the left from tablet width), not
tabs. A description or a comment is Markdown, shown with `Markdown` and cut at a paragraph.

A row links to the app's own page for the thing (`lib/links.ts`), never straight out to GitHub: leaving is the last action on
the detail page. The detail pages read one item from GitHub's GraphQL (`lib/detail.ts`); the address is checked before it is
used (`parseRef`). The service worker keeps the last copy of each page by its address, so the pages open offline.

## Whose data: the GitHub username

Every GitHub list is fetched for a GitHub username the visitor gives, never for the token's owner (`@me`, `viewer`). Without one, the GitHub
pages (`/github`, `/pull-requests`, `/issues`, `/discussions`, `/varsler`) and the GitHub sections of the front page show a form asking for it
instead of data; Vær, Transport and the detail pages (public anyway) work as before. The form is a plain HTML form (no JavaScript) posted to
`/start/api/brukernavn` (`app/api/brukernavn/route.ts`) with the field `github` and a hidden `back`: the endpoint asks GitHub (`GET /users/<u>`,
with the server's token) whether the user exists, keeps the name in the cookie `github_user` (path `/start`, a year, `SameSite=Lax`, `Secure`,
`HttpOnly`) and answers 303 to `back` (which must start with `/start` and have no `//`; else the front page). An unknown name goes back with
`?brukernavn-feil=github&brukernavn-verdi=<what was written>`, which the page's form shows as the error; an empty field removes the cookie.
Whose data it is shows only under Innstillinger › Konto, not on every page. With `MOCK_DATA=1` any name is taken and the
lists come from the mock data as before. `lib/username.ts` (pure, tested) checks the name, the way back and the cookie.

The token is the owner's and could read private repositories, so **every search has `is:public`** and uses the name (`author:<u>`,
`review-requested:<u>`, `assignee:<u>`, `involves:<u>`, Dependabot's `user:<u>`; `userQueries` and `repliesQuery` in `lib/github-query.ts`, tested), the
user's own repositories for CI are `user(login:)` with `privacy: PUBLIC`, and the watched repositories are read only when they are public. The
alerts (`/varsler` and «Følg opp») are shown only when the name is the token's login (any case); for anyone else they say so instead.

No answer is shared between names: the edge cache in `lib/upstream.ts` is keyed by the address and the body, which hold the name; the pages are
rendered per request (`force-dynamic`, `Cache-Control: private, no-store`); and the service worker empties the pages it keeps when the username form
or the settings are sent. The page shows no Spotify data (Spilles nå and Ny musikk are gone; `/musikk` goes to the front page), so the Spotify secrets and the code that read them are gone.

## Alerts

`lib/alerts.ts` (pure, tested): `ciFailures` and `fromOthers`; `lib/github.ts`: `getCiFailures`, `getReplies`, `getDependabot`. GitHub's own
notifications are **not** used: the API does not accept a fine-grained token (403), so «nytt fra andre» is read from the conversations of what
you are involved in (the last comment or review, kept when it is not yours). It sits on the front page as «Følg opp» (red first) and as counts in
the summary, in the morning, the workday, the evening and the weekend, but not at night.

## Sources

| Source | What | Config |
| --- | --- | --- |
| Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8`, the `AI` binding) | A short Norwegian summary at the top of a pull request, an issue, a discussion and the alerts. Cheap by design: a small model, the text cut to a few thousand characters, ~200 tokens out, one call per version of the text (kept a week in the edge cache under a fingerprint), made while the page streams, and left out on any failure | `ai` in `wrangler.jsonc` |
| Design system 8.13 (`EmptyState`, `Time`, `Freshness`, `ConnectionBanner`, `StreamedSection`) | Empty states and every time (rows, comments, «opprettet», «sist endret») use them: relative when recent, a date later, the exact time in `title` | none |
| github.com (`<login>.png`, fetched by the browser) | The picture of each person next to their name on the detail pages (`Person` from the design system, `lib/avatar.ts`): reviewers, assignees, who answered, who commented. No token, nothing through the relay | none |
| Entur (Journey Planner v3, through the relay) | Departures from the stations nearest to the device | none |
| Yr (MET Norway `locationforecast`) | The forecast for the rest of the day | `WEATHER_PLACE`, `WEATHER_LAT`, `WEATHER_LON` in `wrangler.jsonc` |
| GitHub | For the visitor's username (above), public repositories only: pull requests awaiting their review, their open pull requests, issues assigned to them | secret `GITHUB_TOKEN` on `startside-upstream` |

Where the data comes from (GitHub, Entur, Yr, OpenStreetMap via Nominatim) is said once, under «Kilder» at the foot of Innstillinger (`components/credits.tsx`), not on each page.

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

The page follows the time of day in Oslo (`lib/day.ts`, the plan in `lib/plan.ts`). By default (the visitor can change all of it, below):

| | Greeting | Shown | Forecast |
| --- | --- | --- | --- |
| Morning 05–09 | God morgen | weather, pull requests (reviews and own), assigned issues | rest of today |
| Workday 09–16 | God dag | pull requests (reviews and own), assigned issues, weather | rest of today |
| Evening 16–22 | God kveld | own pull requests, weather | tomorrow |
| Night 22–05 | God natt | weather | tomorrow |
| Weekend | as above | as above without issues and discussions, own pull requests only | today by day, tomorrow in the evening |

Before the morning starts (05:00) it is still the day before, so the night after Friday is a weekday and the night after Sunday a weekend.
The time of day only decides which sections show; their order is one order, the visitor's (`order` in `prefs`, the design system's `orderSections`;
by default alerts, pull requests, issues, discussions, weather).

The visitor's settings are the cookie `startside_day` (`lib/day-settings.ts`, path `/start`, a year, `SameSite=Lax`, `Secure`; a query
string, only what differs from the default, removed when all is default): `mode=auto|off` (off: the same page all day, every chosen
section, today's weather, all pull requests), `greeting=on|off` (off: the title is «Startside»), `starts=HH:MM,HH:MM,HH:MM,HH:MM` (morgen,
arbeidsdag, kveld, natt; quarter hours, in order around the clock), `weekend=on|off` (the weekend rule above), `weekenddays=6,0` (0 is
Sunday), `show.<part>=ids`, `weather.<part>=today|tomorrow` and `pulls.<part>=all|mine`. Anything not understood is that field's default.
What is not shown is not fetched. In `next dev`, `NOW=2026-11-18T07:00:00+01:00 npm run dev` stands in for the clock;
it is never read in production. `npm test` covers the parts of the day, their edges, the clocks changing and the forecast windows.

## Issues

Issues are a `SectionGroup` too (`lib/issues.ts`), in the order of what is for you: **Tildelt deg** (any public repository),
**Du er involvert i** (the watched repositories), **Nye uten eier** (made in the last week, nobody on it) and **Nylig aktive**
(what moved lately). An issue is in the first group it belongs to, at most ten each. The watched repositories are
the visitor's, in the cookie `github_repos` (see «First visits and settings»); `GITHUB_WATCH_REPOS` in `wrangler.jsonc` (comma-separated
`owner/name`; `fremtind/jokul` now) is only the suggestion the wizard and the settings page start from. Without the cookie no repository is watched. Shown in the morning and
the workday, not in the evening or the weekend. 

**Discussions** (`lib/discussions.ts`, GraphQL only) in the watched repositories, morning and workday: **Du er med i** and
**Ubesvarte**, at most ten each; nothing is shown where there are none.

Searching on `repo:` or `org:` is blocked for the token by SpareBank 1's SAML single sign-on, while reading the repository
itself is not. So «Du er involvert i» searches by the username (`involves:<u> is:public`) and is filtered to the watched repositories, and
the repositories' own issues (for «Nye uten eier» and «Nylig aktive») and discussions are read straight from them
(`/repos/{repo}/issues`, GraphQL `repository(...)`). `GITHUB_TOKEN` must live 366 days or less (SpareBank 1 blocks GraphQL
and direct reads for longer ones).

**Discussions** (`lib/discussions.ts`, GraphQL only) in the watched repositories, morning and workday: **Du er med i**,
**Ubesvarte spørsmål** (only categories with answers can be unanswered) and **Nylig aktive**, at most ten each.

## Icons

The page asks the design system (5.2) for icons by what they mean (`<Icon name="failure" />`, `icon` on sections and rows,
`StatusLine`): section titles, the kind of each row (pull request, draft, issue, discussion, the weather), every status
(`lib/pr-status.ts` gives each label its icon) and the position button. The weather's icon is chosen from Yr's symbol code
(`weatherIcon` in `lib/forecast.ts`).

## Live updates

An open page keeps itself fresh (`components/refresh.tsx`): every 60 seconds, and at once when the window comes back into view
after more than half that, it asks the server for the page again (`router.refresh()`), so the lists, the weather and the
time of day change without a reload and without losing the page's state. Nothing runs while the window is hidden or the
device is offline. «oppdatert 19:27» under the title is when the server last built the page. If the Access session has
run out, the refresh ends at the login, as a reload would.

**Why a page does not wait for GitHub.** Next's own `revalidate` keeps nothing on Workers without an incremental cache, so every source (`lib/upstream.ts`) is kept in the edge cache
instead: good for its `revalidate` (60 s for GitHub), then shown at once for ten minutes more, as it was, while it is asked for anew in the background (`lib/cache-policy.ts`).
A renewal or a click on GitHub therefore never waits for GitHub unless the answer is older than that; what is shown can be up to a renewal behind. On the GitHub pages the frame, the
navigation and the pages under it are sent first and the lists and counts follow (`StreamedSection`), so the click answers at once. The pull requests are one `SectionGroup` of the design system
(5.1), so the grid places them as one part.

## Position

Without a position, Transport and Vær show a card (`PositionPermission` in `components/position.tsx`, the design system's `PermissionCard`)
that says what the position is for and how the browser stands: «Bruk min posisjon» while it can be asked, waiting while it asks, the way to
allow it in the browser's settings when it said no, and what the page shows without it (Vær: the place in the settings; Transport: nothing).
With a position and the browser still allowing it, the card is gone and the compact control next to the title is left. «Bruk min posisjon» asks the browser for the device's position, on a tap and never on load. The position
is kept in the cookie `startside-pos` (`lat,lon`, three decimals, about a hundred metres, path `/start`, a year) and read by the
server, which finds the nearest stations for it (Transport) and fetches the forecast for it to two decimals (about a kilometre, so
the cache keeps one per square kilometre) and names the place (OpenStreetMap's Nominatim, through the relay, cached for a
day). Once the browser has allowed it, the page follows the device and refreshes when it has moved about two hundred metres.
«Bruk standardsted» removes the cookie and goes back to `WEATHER_*` (and Transport has nothing to show). The position is used for
the stations and the forecast only; GitHub and the rest do not see it. `lib/position.ts` is tested.

## First visits

What a reader has seen is kept in the cookie `seen` (the design system's `lib/onboarding`, path `/start`), read on the server so nothing flashes:
a short intro on the front page (left out while the username form is shown: the form is the introduction then), Transport, Vær and the pages of a
pull request, an issue or a discussion (`intro-front`, `intro-transport`, `intro-weather`, `intro-detail`), each gone for good once dismissed; «Nytt»
on Transport in the navigation until `TRANSPORT_NEW_UNTIL` (`lib/visitor.ts`) or until Transport has been opened (`new-transport`; the time is the
server's); and the offer to install the app on the front page (`install`). An empty list says what would be in it and offers one way on.

## First visits and settings

On a first visit any page (not Innstillinger, the API or the offline page) opens over it the design system's **first-run wizard** (`FirstRun` +
`FirstRunEnhancer`, `components/first-run.tsx`), drawn open by the server until `first-run@1` is in `seen`, so nothing flashes; the intros and the
install offer wait until it is done. One question per step, nine steps: welcome · GitHub username · watched repositories (prefilled with
`GITHUB_WATCH_REPOS`, at most 20) · position · the front page's sections · theme · effects · tilt (the light follows the phone) · install. **Innstillinger** (`app/innstillinger/`) has the same fields
(`components/settings-fields.tsx`) on subpages, one small form each (`components/settings-subpage.tsx`, `?lagret=1` shows «Lagret»), plus the order
(`ReorderList`) and the time of day; links to the old long page's anchors (`#tider`, `#rekkefolge`, …) are sent on to the subpage in the browser.

Both post to `/start/api/innstillinger` (`app/api/innstillinger/route.ts`; pure parts in `lib/settings.ts`, tested), a plain form that works without
JavaScript:

- `validate=<step>` (the wizard with JavaScript, before «Neste») answers `{ "errors": { "<field>": "<melding>" } }` and keeps nothing.
- Otherwise it keeps what is valid: `prefs` (the design system's `lib/preferences`: `theme`, `effects`, `tilt`, `sections`; not `HttpOnly`, the
  page's scripts read it), `github_user` (checked as for `/api/brukernavn`) and `github_repos` (each `owner/name` must be a public repository,
  `GET /repos/{repo}` with `private: false`; `HttpOnly`). It marks the wizard seen and answers 303 to `back` (the wizard sends none, so the page it
  was opened on, from the referrer), with `?lagret=1` for a settings subpage.
- What GitHub did not have goes back at its step: `?forste-gang=<step>#first-run-<step>` from the wizard (it opens there again), `#github` (or `#repos`, `#tider`) on the
  settings subpage, with the errors and what was written in the short-lived cookie `innstillinger-feil` (two minutes, `HttpOnly`). The wizard is not
  marked seen then.
- `skip=1` («Hopp over») only marks it seen; `rerun=1` («Vis introen igjen») removes it from `seen` and goes back.
- `order=<id>,<id>` keeps the front page's order in `prefs` (`order=`). `move=<id>:up|down` (the reorder buttons without JavaScript) moves
  one section in the submitted `order` (or the saved one), keeps only that, and goes back to `back` (`/start/innstillinger/forside`) at `#rekkefolge`.
- With `day=1` (`/start/innstillinger/tid` and its subpages, each sending only its own fields; the wizard never sends it) it keeps `startside_day` (`readDayForm`): `mode`,
  `greeting`, `weekend`, `weather.<part>`, `pulls.<part>` (absent: unchanged), `weekenddays` and `show.<part>` (checkboxes, several values; read only when
  the form says it has them, `has=weekenddays` / `has=show`, and then none ticked is none, so never disable them), and `starts.morgen`, `starts.arbeidsdag`, `starts.kveld`, `starts.natt` (`HH:MM`). Starts that are
  not quarter hours or not in order are not kept: the error goes back as `starts` in `innstillinger-feil`, to `tid/deler#tider`.

`<html>` gets `htmlAttributes(prefs)` in `app/layout.tsx` (`data-theme`, `data-effects`, `data-tilt`), and the front page shows only the chosen
sections (`chosenSections` in `lib/plan.ts`; all ticked is stored as none chosen, so new sections show up). With `MOCK_DATA=1` any username and
repository is taken.

## How it runs

- **`startside`** (`worker.mjs`, `wrangler.jsonc`): the page, on the route `lmfaole.party/start*`. The static files are
  embedded in the script (`scripts/embed-assets.mjs`), so a deploy is one upload.
- **`startside-upstream`** (`upstream/`): a relay on workers.dev. A Worker on the `lmfaole.party` zone gets 525 on every
  fetch to an origin outside Cloudflare, while workers.dev works, so the page fetches Yr and GitHub through it. It takes
  only GET, only those hosts (Yr, GitHub, Nominatim, Entur), and only with the shared secret `UPSTREAM_KEY` (set on both Workers). It holds `GITHUB_TOKEN`.

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

### Mock data (no keys, no network)

`MOCK_DATA=1` makes every upstream (GitHub, Entur, Yr, Nominatim) answer from `lib/mock.ts`, at the one seam `fetchSource()` in `lib/upstream.ts`
(the AI summary is a canned text); the edge cache is skipped, so mock answers never reach a real run. The answers are real, public ones captured by
`node scripts/fetch-mock-data.mjs` (public data only; `fremtind/jokul` and `navikt/aksel` on GitHub with the timelines of their pull requests and issues, a merged
pull request, a closed issue and an answered discussion, Yr for Grünerløkka, Entur's nearest stations for Grünerløkka and the centre (the mock answers any position with the closer of the two, Grünerløkka dressed with a delay, a cancellation and trains), and Nominatim) into `lib/mock-data/*.json`, committed (small, and needed to run offline). Their timestamps are moved to
now when served. Rerun the script to refresh them; `github` needs about 100 requests and the threads of discussions need GraphQL, so give it a token for that run only:
`GITHUB_TOKEN=$(gh auth token) node scripts/fetch-mock-data.mjs github` (it is sent, never saved). Put it in `.env.local` (read by `next dev`; gitignored)
and/or `.dev.vars`, with `GITHUB_WATCH_REPOS=fremtind/jokul,navikt/aksel` for the watched-repository parts. Unset, nothing changes. Never set it in production.
The app is served under the base path, so the start page is <http://localhost:3000/start> (`/` is 404 by design). Give any GitHub username in the form (or `curl -b github_user=octocat`); the mock's own login (`lmfaole`) also shows the alerts.

The page shows personal data, so `lmfaole.party/start` is behind Cloudflare Access (the application «Startside»): only the owner's address gets in, with a login code by e-mail.

## Add a source

One file in `lib/` that fetches and shapes the data, one async server component in `app/page.tsx` that renders it with
the design system's components, wrapped so a failure stays in its own section.
