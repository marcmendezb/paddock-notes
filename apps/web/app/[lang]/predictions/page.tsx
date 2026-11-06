import type { Metadata } from "next";
import Link from "next/link";
import { gpName, type PredictionScore } from "@paddock/shared";
import { FormMessage } from "@/components/form-message";
import { api } from "@/lib/api";
import { formatDateTime, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { currentUser, userGet, type Driver } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ msg?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).predictions;
  return { title: t.title, description: t.lede, alternates: { canonical: `/${lang}/predictions` } };
}

interface Form {
  deadline: string | null;
  open: boolean;
  drivers: Driver[];
  picks: { p1: string; p2: string; p3: string; pole: string } | null;
}

/** Predicciones (COM-04 a COM-06): formulario de la próxima carrera, historial puntuado y ranking global. */
export default async function PredictionsPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { msg } = await searchParams;
  const t = dict(lang).predictions;
  const [me, next, ranking] = await Promise.all([currentUser(), api.nextRace(), api.rankings("current")]);
  const season = next?.data.season ?? new Date().getUTCFullYear();
  const [form, mine] = me && next
    ? await Promise.all([
        userGet<Form>(`/predictions/${next.data.season}/${next.data.round}`),
        userGet<{ round: number; p1: string; p2: string; p3: string; pole: string; score: PredictionScore | null }[]>(`/predictions/${season}/me`),
      ])
    : [null, null];
  const name = (id: string) => {
    const d = form?.drivers.find((x) => x.id === id);
    return d ? fullName(d) : id;
  };

  return (
    <div className="container stack-xl prose">
      <div className="stack-s">
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>
        <details>
          <summary>{lang === "es" ? "Cómo se puntúa" : "How scoring works"}</summary>
          <p className="muted">{t.rules}</p>
          <p className="muted">{t.tieBreak}</p>
        </details>
        <FormMessage lang={lang} msg={msg} />
      </div>

      {!next ? (
        <p className="muted">{t.none}</p>
      ) : !me ? (
        <p>
          <Link href={`/${lang}/account`}>{t.signInFirst}</Link>
        </p>
      ) : form ? (
        <section aria-labelledby="next" className="stack">
          <h2 id="next">{t.next(gpName(lang, next.data.name))}</h2>
          {form.deadline ? <p className="muted">{form.open ? t.closes(`${formatDateTime(lang, form.deadline, "UTC")} (UTC)`) : t.closed}</p> : null}
          {form.open ? (
            <form action={`/${lang}/forms/prediction`} method="post" className="stack">
              <input type="hidden" name="back" value="predictions" />
              <input type="hidden" name="season" value={next.data.season} />
              <input type="hidden" name="round" value={next.data.round} />
              {(["p1", "p2", "p3", "pole"] as const).map((key) => (
                <label key={key} className="inline-form">
                  <span>{t[key]}</span>
                  <select name={key} defaultValue={form.picks?.[key] ?? ""} required>
                    <option value="" disabled>
                      —
                    </option>
                    {form.drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {fullName(d)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button type="submit">{t.save}</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {mine && mine.length > 0 ? (
        <section aria-labelledby="mine" className="stack">
          <h2 id="mine">{t.mine}</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={t.mine}>
            <table>
              <thead>
                <tr>
                  <th scope="col" className="num">{dict(lang).standings2.round}</th>
                  <th scope="col">{t.p1} · {t.p2} · {t.p3}</th>
                  <th scope="col">{t.pole}</th>
                  <th scope="col" className="num">{t.points}</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((p) => (
                  <tr key={p.round}>
                    <td className="num">{p.round}</td>
                    <td>{[p.p1, p.p2, p.p3].map(name).join(" · ")}</td>
                    <td>{name(p.pole)}</td>
                    <td className="num">{p.score ? p.score.points : t.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="ranking" className="stack">
        <h2 id="ranking">{t.ranking}</h2>
        {ranking && ranking.data.length > 0 ? (
          <div className="table-wrap" tabIndex={0} role="region" aria-label={t.ranking}>
            <table>
              <thead>
                <tr>
                  <th scope="col" className="num">Pos.</th>
                  <th scope="col">{dict(lang).account.alias}</th>
                  <th scope="col" className="num">{t.points}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.data.map((r, i) => (
                  <tr key={i}>
                    <td className="num">{r.rank}</td>
                    <th scope="row">{r.name}</th>
                    <td className="num">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t.noRanking}</p>
        )}
      </section>
    </div>
  );
}
