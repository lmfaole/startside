import { ErrorMessage } from "@lmfaole/designsystem/components/error-message"
import { Grid, Stack } from "@lmfaole/designsystem/components/layout"
import { PageHeader } from "@lmfaole/designsystem/components/page-header"
import { PageLayout } from "@lmfaole/designsystem/components/page-layout"
import { PageSection } from "@lmfaole/designsystem/components/page-section"
import { Rows, type RowData } from "@lmfaole/designsystem/components/rows"
import { ExternalLink } from "@lmfaole/designsystem/components/external-link"
import { Text } from "@lmfaole/designsystem/components/text"

import { Install } from "../components/install"
import { getGithub, type Item } from "../lib/github"
import { describeSymbol, getWeather } from "../lib/yr"

// Rendered on the server for every request: the page shows what is true now.
export const dynamic = "force-dynamic"

const TIME_ZONE = "Europe/Oslo"
const clock = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
const day = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE })
const short = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: TIME_ZONE })
const number = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 })

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

async function Weather() {
  try {
    const { place, hours } = await getWeather()
    const rows: RowData[] = hours.map((hour) => ({
      key: hour.time,
      body: (
        <Text as="span" size="sm">
          <Text as="span" size="sm" numeric weight="medium">
            {clock.format(new Date(hour.time))}
          </Text>{" "}
          {describeSymbol(hour.symbol)}
        </Text>
      ),
      trailing: `${Math.round(hour.temperature)}° · ${number.format(hour.precipitation)} mm · ${number.format(hour.wind)} m/s`,
    }))
    return (
      <PageSection id="weather" title={`Vær i ${place}`}>
        <Rows rows={rows} columns={{ name: "Tid og vær", value: "Temperatur, nedbør og vind" }} />
        <Text size="xs" tone="muted">
          Værdata fra <ExternalLink href="https://www.yr.no">Yr</ExternalLink> (Meteorologisk institutt).
        </Text>
      </PageSection>
    )
  } catch (error) {
    return (
      <PageSection id="weather" title="Vær">
        <ErrorMessage error={asError(error)}>Kunne ikke hente været</ErrorMessage>
      </PageSection>
    )
  }
}

function itemRows(items: Item[]): RowData[] {
  return items.map((item) => ({
    key: item.key,
    body: (
      <Stack gap="xs">
        <ExternalLink href={item.href}>{item.title}</ExternalLink>
        <Text size="xs" tone="muted">
          {item.repo}
        </Text>
      </Stack>
    ),
    trailing: short.format(new Date(item.updated)),
  }))
}

async function Github() {
  try {
    const { reviews, mine, issues } = await getGithub()
    const lists = [
      { id: "reviews", title: "Venter på din review", items: reviews, empty: "Ingen å se på." },
      { id: "mine", title: "Dine åpne pull requests", items: mine, empty: "Ingen åpne." },
      { id: "issues", title: "Tildelt deg", items: issues, empty: "Ingen saker." },
    ]
    return (
      <>
        {lists.map((list) => (
          <PageSection key={list.id} id={list.id} title={list.title}>
            {list.items.length === 0 ? (
              <Text size="sm" tone="muted">
                {list.empty}
              </Text>
            ) : (
              <Rows rows={itemRows(list.items)} columns={{ name: "Tittel", value: "Sist oppdatert" }} />
            )}
          </PageSection>
        ))}
      </>
    )
  } catch (error) {
    return (
      <PageSection id="github" title="GitHub">
        <ErrorMessage error={asError(error)}>Kunne ikke hente GitHub</ErrorMessage>
      </PageSection>
    )
  }
}

export default function Page() {
  return (
    <PageLayout>
      <PageHeader title="God dag" lead={day.format(new Date())} actions={<Install />} />
      <Grid columns="sections" gap="xl">
        <Github />
        <Weather />
      </Grid>
    </PageLayout>
  )
}
