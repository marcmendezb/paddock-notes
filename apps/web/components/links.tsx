import Link from "next/link";
import type { ConstructorRef, DriverRef, Lang } from "@paddock/shared";
import { fullName } from "@/lib/format";

/** Enlaces cruzados automáticos a las fichas (TRA-04). */

export function DriverLink({ lang, driver }: { lang: Lang; driver: DriverRef }) {
  return <Link href={`/${lang}/drivers/${driver.id}`}>{fullName(driver)}</Link>;
}

export function TeamLink({ lang, team }: { lang: Lang; team: ConstructorRef }) {
  return <Link href={`/${lang}/constructors/${team.id}`}>{team.name}</Link>;
}

export function CircuitLink({ lang, id, name }: { lang: Lang; id: string; name: string }) {
  return <Link href={`/${lang}/circuits/${id}`}>{name}</Link>;
}
