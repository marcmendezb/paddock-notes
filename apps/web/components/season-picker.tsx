import { FIRST_SEASON, type Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/** Season picker back to 1950 (NUC-15). A GET form: it needs no JavaScript. */
export function SeasonPicker({ lang, season, base }: { lang: Lang; season: number; base: "races" | "standings" }) {
  const t = dict(lang).calendar;
  const last = new Date().getUTCFullYear();
  const seasons = Array.from({ length: last - FIRST_SEASON + 1 }, (_, i) => last - i);
  return (
    <form action={`/${lang}/${base}`} method="get" className="season-picker">
      <label htmlFor="season">{t.season}</label>
      <select id="season" name="season" defaultValue={season}>
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button type="submit">{t.go}</button>
    </form>
  );
}
