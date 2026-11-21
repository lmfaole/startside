import { SourceList } from "@lmfaole/designsystem/components/source-list"

/** Where the data comes from, once, at the foot of «Innstillinger» rather than on the pages that use it: each source with its mark beside its name, what it gives, and the credit its licence asks for. */
export function Credits() {
  return (
    <SourceList
      sources={[
        { name: "GitHub", brand: "github", href: "https://github.com", description: "Offentlige pull requests, saker og diskusjoner for brukeren du har valgt." },
        { name: "Entur", brand: "entur", href: "https://entur.no", description: "Stasjoner og avganger." },
        { name: "Yr", brand: "yr", href: "https://www.yr.no", description: "Værdata fra Meteorologisk institutt." },
        { name: "OpenStreetMap", brand: "openstreetmap", href: "https://www.openstreetmap.org/copyright", description: "Navnet på stedet du er.", credit: "© OpenStreetMap-bidragsytere." },
      ]}
    />
  )
}
