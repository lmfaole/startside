# startside

A personal start page (Next.js SSR on Cloudflare Workers) built from the design system `@lmfaole/designsystem`. See README.md for what
it is, where it runs and how it is deployed.

## UI work follows the design system's skills

Before building or changing anything a person sees, use the skills in `.claude/skills/` (installed from the design system with
`npm run skills`, checked in CI with `npm run skills:check`; never edit them here, change them in the design system):

- `designsystem-ux`: the structure (front page as a digest, lists, detail pages, links, navigation, states)
- `designsystem-ui`: the look (components and tokens only, no className, icons by meaning)
- `designsystem-accessibility`: WCAG 2.2 AA
- `designsystem-content`: the words (Norwegian bokmål)
- `designsystem-components`: which component for what
- `designsystem-review`: run before calling UI work done

## Rules of this project

- The project writes **no styling of its own**: no `className`, `style` or stylesheet. When nothing fits, add a component to the design
  system (a minor version), then use it here.
- Pages are in `app/`, data in `lib/`, shared parts in `components/`. Logic that can be pure is pure, in `lib/`, with a test
  (`npm test`, node's runner; a module that imports `env`, `upstream` or the design system's components cannot be imported by a test).
- Plain `<a>` links in the design system's components do not get the base path: write `/start/...` (`withBase` in `lib/links.ts`).
- A row links to the app's own page for the thing; a link out to GitHub is the last action on the detail page.
- The design system is pinned to a commit in `package.json`; after changing the pin, run `npm run skills`.
