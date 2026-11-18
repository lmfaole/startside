/**
 * The front page is a digest: the first few things that need the reader most, from lists that are already in the order of
 * what needs them most. Takes from the first list until it is empty, then the next, up to `limit`.
 */
export function takeFirst<T>(lists: readonly (readonly T[])[], limit: number): T[] {
  return lists.flat().slice(0, limit)
}

/** How many there are in the groups with an id, `0` where there are none. */
export function countOf<G extends { id: string }>(groups: readonly G[], id: G["id"], size: (group: G) => number): number {
  const group = groups.find((candidate) => candidate.id === id)
  return group === undefined ? 0 : size(group)
}

/** A short text from a longer one: cut at a word, with an ellipsis, and nothing where there is no text. Line breaks become spaces. */
export function excerpt(text: string | null | undefined, max = 280): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "")}…`
}
