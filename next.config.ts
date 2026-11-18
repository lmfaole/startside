import type { NextConfig } from "next"

const config: NextConfig = {
  // The design system ships as TypeScript source, so Next has to compile it.
  transpilePackages: ["@lmfaole/designsystem"],
}

export default config
