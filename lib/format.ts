export const TIME_ZONE = "Europe/Oslo"

export const clock = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
export const dateLine = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE })
export const short = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: TIME_ZONE })
export const long = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE })
export const number = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 })

/** A temperature with the sign and the degree: `−3°` (the minus sign, not a hyphen). */
export const degrees = (value: number): string => `${Math.round(value) < 0 ? "−" : ""}${Math.abs(Math.round(value))}°`
