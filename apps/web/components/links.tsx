import Link from "next/link";
import type { ConstructorRef, DriverRef, Lang } from "@paddock/shared";

/** Automatic cross-links to profiles (TRA-04). */

/**
 * The given and family names in their own spans: narrow timing tables keep only the family name on screen,
 * as a timing screen does, while the accessible name stays the full one.
 */
export function DriverLink({ lang, driver }: { lang: Lang; driver: DriverRef }) {
  return (
    <Link href={`/${lang}/drivers/${driver.id}`}>
      <span className="dn-given">{driver.givenName}</span> <span className="dn-family">{driver.familyName}</span>
    </Link>
  );
}

export function TeamLink({ lang, team }: { lang: Lang; team: ConstructorRef }) {
  return <Link href={`/${lang}/constructors/${team.id}`}>{team.name}</Link>;
}

export function CircuitLink({ lang, id, name }: { lang: Lang; id: string; name: string }) {
  return <Link href={`/${lang}/circuits/${id}`}>{name}</Link>;
}
