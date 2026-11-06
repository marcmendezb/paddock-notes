import { redirect } from "next/navigation";
import { FIRST_SEASON } from "@paddock/shared";
import { parseLang } from "@/lib/params";

export default async function StandingsIndex({
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
    requested && /^\d{4}$/.test(requested) && Number(requested) >= FIRST_SEASON && Number(requested) <= current
      ? Number(requested)
      : current;
  redirect(`/${lang}/standings/${season}`);
}
