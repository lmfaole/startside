import { Button } from "@lmfaole/designsystem/components/ui/button"

import { BASE } from "../lib/links"
import { SETTINGS_ENDPOINT } from "../lib/settings"

/** «Vis introen igjen»: the endpoint takes `first-run` out of `seen`, and the wizard opens on the front page. */
export function IntroAgain() {
  return (
    <form method="post" action={SETTINGS_ENDPOINT}>
      <input type="hidden" name="back" value={BASE} />
      <input type="hidden" name="rerun" value="1" />
      <Button type="submit" variant="outline">
        Vis introen igjen
      </Button>
    </form>
  )
}
