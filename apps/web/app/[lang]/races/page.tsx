import { redirect } from "next/navigation";
import { FIRST_SEASON } from "@paddock/shared";
import { parseLang } from "@/lib/params";

/**
 * /races leads to the current season. The season picker sends `?season=` with a GET form, so it works
 * without JavaScript (TRA-34). Only valid years are accepted.
 */
export default async function RacesIndex({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const lang = parseLang((await params).lang);
  const requested = (await searchParams).season;
  const current = new Date().getUTCFullYear();
  const season =
    requested && /^\d{4}$/.test(requested) && Number(requested) >= FIRST_SEASON && Number(requested) <= current + 1
      ? Number(requested)
      : current;
  redirect(`/${lang}/races/${season}`);
}
