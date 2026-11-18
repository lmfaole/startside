import type { Day, DayPart } from "./day"

export type SectionId = "weather" | "reviews" | "mine" | "issues"

export interface Plan {
  greeting: string
  /** What is shown, in this order; what is not here is not fetched either. */
  sections: SectionId[]
  /** The forecast for the rest of the day, or for the day after it (counted from the date the day belongs to). */
  weatherWindow: "today" | "tomorrow"
}

const GREETINGS: Record<DayPart, string> = { morgen: "God morgen", arbeidsdag: "God dag", kveld: "God kveld", natt: "God natt" }

const WEEKDAY: Record<DayPart, Omit<Plan, "greeting">> = {
  morgen: { sections: ["weather", "reviews", "mine", "issues"], weatherWindow: "today" },
  arbeidsdag: { sections: ["reviews", "mine", "issues", "weather"], weatherWindow: "today" },
  kveld: { sections: ["mine", "weather"], weatherWindow: "tomorrow" },
  natt: { sections: ["weather"], weatherWindow: "tomorrow" },
}

/** What the page is made of at a time of day: weekends leave out the work (reviews and assigned issues). */
export function planFor({ part, weekend }: Pick<Day, "part" | "weekend">): Plan {
  const plan = WEEKDAY[part]
  const weatherWindow = weekend && (part === "morgen" || part === "arbeidsdag") ? "today" : plan.weatherWindow
  const sections = weekend ? (part === "natt" ? plan.sections : ["weather" as const, "mine" as const]) : plan.sections
  return { greeting: GREETINGS[part], sections: [...sections], weatherWindow }
}
