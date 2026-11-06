import type { Metadata } from "next";
import Link from "next/link";
import { gpName, isoWeek, type QuizQuestion } from "@paddock/shared";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).quiz;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/quiz`, languages: { es: "/es/quiz", en: "/en/quiz" } },
  };
}

/** Quiz semanal (COM-08): jugable sin cuenta y sin JavaScript (formulario GET con las respuestas). */
export default async function QuizPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const query = await searchParams;
  const t = dict(lang);
  const week = query.w && /^\d{4}-W\d{2}$/.test(query.w) ? query.w : isoWeek(new Date());
  const [quiz, me] = await Promise.all([api.quiz(week), currentUser()]);
  const questions = quiz?.data.questions ?? [];
  const answered = questions.some((q) => query[q.id] !== undefined);
  const score = questions.filter((q) => query[q.id] === q.answer).length;

  const prompt = (q: QuizQuestion) =>
    t.quiz.prompts[q.kind](q.kind === "race-winner" || q.kind === "pole" ? gpName(lang, q.subject ?? "") : (q.subject ?? ""), q.season);

  return (
    <div className="container stack-xl prose">
      <div className="stack-s">
        <h1>{t.quiz.title}</h1>
        <p className="lede">{t.quiz.lede}</p>
        <p className="muted tabular">{week}</p>
      </div>

      {questions.length === 0 ? (
        <p className="muted">{t.quiz.empty}</p>
      ) : (
        <form action={`/${lang}/quiz`} method="get" className="stack-l">
          <input type="hidden" name="w" value={week} />
          {answered ? (
            <p className="auto-note" role="status">
              {t.quiz.score(score, questions.length)}
            </p>
          ) : null}
          {questions.map((q, i) => {
            const chosen = query[q.id];
            const right = q.options.find((o) => o.id === q.answer)!;
            return (
              <fieldset key={q.id} className="stack-s quiz-question">
                <legend className="h-small">
                  {i + 1}. {prompt(q)}
                </legend>
                {q.options.map((o) => (
                  <label key={o.id} className="quiz-option">
                    <input type="radio" name={q.id} value={o.id} defaultChecked={chosen === o.id} required />
                    {o.label}
                    {answered && o.id === q.answer ? <strong> · {t.quiz.correct}</strong> : null}
                    {answered && o.id === chosen && chosen !== q.answer ? <span> · {t.quiz.wrong}</span> : null}
                  </label>
                ))}
                {answered ? (
                  <p className="muted">
                    {chosen === undefined ? `${t.quiz.unanswered}. ` : ""}
                    {t.quiz.answer(right.label)}{" "}
                    {q.race ? (
                      <Link href={`/${lang}/races/${q.race.season}/${q.race.round}`}>{t.quiz.seeRace}</Link>
                    ) : (
                      <Link href={`/${lang}/standings/${q.season}`}>{t.quiz.seeSeason}</Link>
                    )}
                  </p>
                ) : null}
              </fieldset>
            );
          })}
          <button type="submit">{t.quiz.check}</button>
        </form>
      )}
      {answered && me ? (
        <form action={`/${lang}/forms/quiz-score`} method="post">
          <input type="hidden" name="week" value={week} />
          <input type="hidden" name="back" value={`quiz?w=${week}`} />
          {questions.map((q) => (query[q.id] ? <input key={q.id} type="hidden" name={q.id} value={query[q.id]} /> : null))}
          <button type="submit">{lang === "es" ? "Guardar mi puntuación" : "Save my score"}</button>
        </form>
      ) : null}
    </div>
  );
}
