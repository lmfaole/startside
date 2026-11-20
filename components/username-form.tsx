import { Button } from "@lmfaole/designsystem/components/button"
import { Icon } from "@lmfaole/designsystem/components/icon"
import { Inline, Stack } from "@lmfaole/designsystem/components/layout"
import { Heading, Text, TextLink } from "@lmfaole/designsystem/components/text"
import { TextField } from "@lmfaole/designsystem/components/text-field"
import type { IconName } from "@lmfaole/designsystem/lib/icons"

/*
 * TEMPORARY: stand-ins for the design system's `UsernameForm` (components/username-form) and `UserChip` (components/user-chip),
 * with the same props, until the design system has them (8.48.0). Then the imports are swapped and this file is deleted.
 */

export interface UsernameField {
  name: string
  label: string
  value?: string
  hint?: string
  error?: string
  autoComplete?: string
  placeholder?: string
}

export interface UsernameFormProps {
  title: string
  body?: string
  action: string
  back: string
  fields: UsernameField[]
  submitLabel?: string
  icon?: IconName
  headingLevel?: 2 | 3
}

/** A plain form (no client JavaScript) that asks whose data to show, posted to the app's endpoint, which comes back to `back`. */
export function UsernameForm({ title, body, action, back, fields, submitLabel = "Hent data", icon = "person", headingLevel = 2 }: UsernameFormProps) {
  const id = `brukernavn-${fields.map((field) => field.name).join("-")}`
  return (
    <Stack as="section" gap="md" aria-labelledby={id}>
      <Inline gap="sm">
        <Icon name={icon} />
        <Heading level={headingLevel} id={id}>
          {title}
        </Heading>
      </Inline>
      {body === undefined ? null : <Text tone="muted">{body}</Text>}
      <form method="post" action={action}>
        <Stack gap="md" width="prose">
          <input type="hidden" name="back" value={back} />
          {fields.map((field) => (
            <TextField key={field.name} name={field.name} label={field.label} defaultValue={field.value} hint={field.hint} error={field.error} autoComplete={field.autoComplete ?? "username"} />
          ))}
          <Inline>
            <Button type="submit">{submitLabel}</Button>
          </Inline>
        </Stack>
      </form>
    </Stack>
  )
}

/** «Viser data for kari · Bytt»: whose data the page shows, and the way to change it. */
export function UserChip({ label = "Viser data for", user, href, changeLabel = "Bytt" }: { label?: string; user: string; href: string; changeLabel?: string }) {
  return (
    <Text size="sm" tone="muted">
      {label}{" "}
      <Text as="span" size="sm" weight="medium">
        {user}
      </Text>{" "}
      · <TextLink href={href}>{changeLabel}</TextLink>
    </Text>
  )
}
