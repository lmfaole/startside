/**
 * The front page's one order of sections, kept in the `prefs` cookie as `order=a,b,c` (comma ids). The design system's `lib/preferences`
 * does not know `order` before 8.51 (`Prefs.order`, `orderSections`, `lib/reorder`'s `applyMove`): until then it is read and written
 * here, beside `parsePrefs`/`serializePrefs`. Pure, so a test pins it.
 */

const ID = /^[a-z][a-z0-9-]{0,39}$/

const ids = (text: string): string[] => [...new Set(text.split(",").map((id) => id.trim()).filter((id) => ID.test(id)))]

/** The saved order in the `prefs` cookie's value (raw or decoded); `undefined` when none is saved. */
export function parseOrder(prefsValue: string | null | undefined): string[] | undefined {
  let text = prefsValue ?? ""
  try {
    text = decodeURIComponent(text)
  } catch {
    // Not encoded after all: read as it is.
  }
  const order = new URLSearchParams(text).get("order")
  return order === null ? undefined : ids(order)
}

/** The `order` form field (comma ids) as a list; `undefined` when absent. */
export function readOrder(value: FormDataEntryValue | null): string[] | undefined {
  return typeof value === "string" ? ids(value) : undefined
}

/** The `prefs` value (`serializePrefs`'s) with `order` set (or left out: `undefined`). */
export function withOrder(prefsValue: string, order: readonly string[] | undefined): string {
  const params = new URLSearchParams(prefsValue)
  params.delete("order")
  if (order !== undefined && order.length > 0) params.set("order", order.join(","))
  return params.toString()
}

/** `ids` in the saved order: the ones the order names first, in its order, then the rest (new ones) in their default order. Unknown saved ids are ignored. */
export function sectionOrder<T extends string>(sections: readonly T[], order?: readonly string[]): T[] {
  if (order === undefined) return [...sections]
  const known = order.filter((id): id is T => (sections as readonly string[]).includes(id))
  return [...known, ...sections.filter((id) => !known.includes(id))]
}

/** `move` (`<id>:up` or `<id>:down`) applied to `order`; anything else, or a move past the end, leaves it as it is. */
export function applyMove(order: readonly string[], move: string): string[] {
  const match = /^(.+):(up|down)$/.exec(move)
  const next = [...order]
  if (match === null) return next
  const from = next.indexOf(match[1])
  const to = match[2] === "up" ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= next.length) return next
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}
