# startside

A personal start page: what to do and look at during the working day, fetched from outside services and rendered on the
server on every request. Next.js (App Router, SSR) on Cloudflare Workers through OpenNext, built from the components of
[`lmfaole/designsystem`](https://github.com/lmfaole/designsystem). The project writes no styling of its own.

## Sources

| Source | What | Config |
| --- | --- | --- |
| Yr (MET Norway `locationforecast`) | The forecast for the rest of the day | `WEATHER_PLACE`, `WEATHER_LAT`, `WEATHER_LON` in `wrangler.jsonc` |
| GitHub | Pull requests awaiting your review, your open pull requests, issues assigned to you | secret `GITHUB_TOKEN` on `startside-upstream` |

A source that fails shows its own error and does not take the page down.

## How it runs

- **`startside`** (`worker.mjs`, `wrangler.jsonc`): the page, on the route `lmfaole.party/start*`. The static files are
  embedded in the script (`scripts/embed-assets.mjs`), so a deploy is one upload.
- **`startside-upstream`** (`upstream/`): a relay on workers.dev. A Worker on the `lmfaole.party` zone gets 525 on every
  fetch to an origin outside Cloudflare, while workers.dev works, so the page fetches Yr and GitHub through it. It takes
  only GET, only those hosts, and only with the shared secret `UPSTREAM_KEY` (set on both Workers). It holds `GITHUB_TOKEN`.

In `next dev` there is no `UPSTREAM_URL`, so the page fetches the sources directly.

Served at `lmfaole.party/start` through a Cloudflare route (`wrangler.jsonc`), with `basePath: "/start"` in `next.config.ts`.

## Deploy

`.github/workflows/deploy.yml` builds every push and deploys the default branch (and manual runs) to Cloudflare. It needs
three repository secrets:

| Secret | What |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | A token with *Workers Scripts: Edit* and *Workers Routes: Edit* on the `lmfaole.party` zone |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account id |
| `GH_PAT` | The GitHub token the page reads with; set on the Worker as `GITHUB_TOKEN` |

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
