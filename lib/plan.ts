import type { Day, DayPart } from "./day"

export type SectionId = "departures" | "weather" | "alerts" | "pulls" | "issues" | "discussions"

export interface Plan {
  greeting: string
  /** What is shown, in this order; what is not here is not fetched either. */
  sections: SectionId[]
  /** The forecast for the rest of the day, or for the day after it (counted from the date the day belongs to). */
  weatherWindow: "today" | "tomorrow"
  /** Pull requests: both the ones waiting for your review and your own, or only your own. */
  pulls: "all" | "mine"
}

const GREETINGS: Record<DayPart, string> = { morgen: "God morgen", arbeidsdag: "God dag", kveld: "God kveld", natt: "God natt" }

const WEEKDAY: Record<DayPart, Omit<Plan, "greeting">> = {
  morgen: { sections: ["weather", "alerts", "pulls", "issues", "discussions"], weatherWindow: "today", pulls: "all" },
  arbeidsdag: { sections: ["alerts", "pulls", "issues", "discussions", "weather"], weatherWindow: "today", pulls: "all" },
  kveld: { sections: ["alerts", "pulls", "weather"], weatherWindow: "tomorrow", pulls: "mine" },
  natt: { sections: ["weather"], weatherWindow: "tomorrow", pulls: "mine" },
}

/** What the page is made of at a time of day: weekends leave out the work (reviews and assigned issues) but keep what is red or waiting in your own repositories. */
/** The way to work and the way home: weekdays 06–09 and 15–18, when departures are what the reader needs. */
export function commuting({ hour, weekend }: Pick<Day, "hour" | "weekend">): boolean {
  return !weekend && ((hour >= 6 && hour < 9) || (hour >= 15 && hour < 18))
}

export function planFor({ part, weekend, hour }: Pick<Day, "part" | "weekend" | "hour">): Plan {
  const plan = WEEKDAY[part]
  const weatherWindow = weekend && (part === "morgen" || part === "arbeidsdag") ? "today" : plan.weatherWindow
  const sections = weekend ? (part === "natt" ? plan.sections : ["weather" as const, "alerts" as const, "pulls" as const]) : plan.sections
  // Departures lead the page only while commuting.
  const lead: SectionId[] = commuting({ hour, weekend }) ? ["departures"] : []
  return { greeting: GREETINGS[part], sections: [...lead, ...sections], weatherWindow, pulls: weekend ? "mine" : plan.pulls }
}
