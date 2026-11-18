import type { NextConfig } from "next"

const config: NextConfig = {
  // Served at lmfaole.party/start, next to the static front page.
  basePath: "/start",
  // The design system ships as TypeScript source, so Next has to compile it.
  transpilePackages: ["@lmfaole/designsystem"],
}

export default config
