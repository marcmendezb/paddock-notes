import type { Metadata } from "next";
import Link from "next/link";
import { gpName, isoWeek, type QuizQuestion } from "@paddock/shared";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { QuizBar } from "@/components/quiz-bar";
import { Icon, type IconName } from "@/components/icons";
import { formatDate } from "@/lib/format";
import { parseLang } from "@/lib/params";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).quiz;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/quiz`, languages: { es: "/es/quiz", en: "/en/quiz", de: "/de/quiz" } },
  };
}

/** Weekly quiz (COM-08): playable without an account and without JavaScript (a GET form with the answers). */
export default async function QuizPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const query = await searchParams;
  const t = dict(lang);
  const week = query.w && /^\d{4}-W\d{2}$/.test(query.w) ? query.w : isoWeek(new Date());
  const [quiz, me] = await Promise.all([api.quiz(week), currentUser()]);
  const questions = quiz?.data.questions ?? [];
  const answered = questions.some((q) => query[q.id] !== undefined);
  const score = questions.filter((q) => query[q.id] === q.answer).length;

  // The quiz changes every Monday: the next Monday in UTC.
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() + (((8 - monday.getUTCDay()) % 7) || 7));
  const KIND_ICON: Record<QuizQuestion["kind"], IconName> = { "race-winner": "flag", champion: "trophy", "constructor-champion": "wrench", "season-wins": "bolt", pole: "stopwatch" };

  const progressLabel = { es: "{n} de {total} respondidas", en: "{n} of {total} answered", de: "{n} von {total} beantwortet" }[lang];

  const prompt = (q: QuizQuestion) =>
    t.quiz.prompts[q.kind](q.kind === "race-winner" || q.kind === "pole" ? gpName(lang, q.subject ?? "") : (q.subject ?? ""), q.season);

  return (
    <>
      <PageHero
        icon="bolt"
        kicker={<span className="tabular">{week}</span>}
        title={t.quiz.title}
        lede={<p>{t.quiz.lede}</p>}
        aside={
          answered ? (
            <div className="qz-score" role="status">
              <span className="qz-score-n tabular">
                {score}
                <span className="qz-score-total">/{questions.length}</span>
              </span>
              <span className="qz-score-text">
                {t.quiz.score(score, questions.length)} {t.quiz.verdict(score, questions.length)}
              </span>
              <span className="qz-strip" aria-hidden="true">
                {questions.map((q) => (
                  <span key={q.id} className={query[q.id] === q.answer ? "is-right" : "is-wrong"} />
                ))}
              </span>
            </div>
          ) : questions.length ? (
            <div className="qz-score">
              <span className="qz-score-text">{t.quiz.meta(questions.length)}</span>
              <span className="qz-strip" aria-hidden="true">
                {questions.map((q) => (
                  <span key={q.id} />
                ))}
              </span>
              <span className="pr-next-deadline">{t.quiz.nextQuiz(formatDate(lang, monday.toISOString().slice(0, 10)))}</span>
            </div>
          ) : undefined
        }
      />
      <div className="container stack-xl qz">

      {questions.length === 0 ? (
        <p className="muted">{t.quiz.empty}</p>
      ) : (
        <form action={`/${lang}/quiz`} method="get" className="stack-l">
          <input type="hidden" name="w" value={week} />
          {questions.map((q, i) => {
            const chosen = query[q.id];
            const right = q.options.find((o) => o.id === q.answer)!;
            return (
              <fieldset key={q.id} className="quiz-question">
                <legend className="quiz-legend">
                  <span className="quiz-n tabular" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="quiz-prompt">
                    <span className="quiz-kind">
                      <Icon name={KIND_ICON[q.kind]} /> {t.quiz.kinds[q.kind]}
                      {answered ? (
                        <span className={chosen === q.answer ? "quiz-result is-right" : "quiz-result is-wrong"}>
                          {chosen === q.answer ? t.quiz.correct : t.quiz.wrong}
                        </span>
                      ) : null}
                    </span>
                    {prompt(q)}
                  </span>
                </legend>
                <div className="quiz-options">
                {q.options.map((o) => (
                  <label
                    key={o.id}
                    className={`quiz-option${answered && o.id === q.answer ? " is-right" : ""}${answered && o.id === chosen && chosen !== q.answer ? " is-wrong" : ""}`}
                  >
                    <input type="radio" name={q.id} value={o.id} defaultChecked={chosen === o.id} required />
                    {o.label}
                    {answered && o.id === q.answer ? <strong> · {t.quiz.correct}</strong> : null}
                    {answered && o.id === chosen && chosen !== q.answer ? <span> · {t.quiz.wrong}</span> : null}
                  </label>
                ))}
                </div>
                {answered ? (
                  <p className="quiz-explain">
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
          <QuizBar total={questions.length} template={progressLabel} button={t.quiz.check} />
        </form>
      )}
      {answered && me ? (
        <form action={`/${lang}/forms/quiz-score`} method="post">
          <input type="hidden" name="week" value={week} />
          <input type="hidden" name="back" value={`quiz?w=${week}`} />
          {questions.map((q) => (query[q.id] ? <input key={q.id} type="hidden" name={q.id} value={query[q.id]} /> : null))}
          <button type="submit">{{ es: "Guardar mi puntuación", en: "Save my score", de: "Mein Ergebnis speichern" }[lang]}</button>
        </form>
      ) : null}
      </div>
    </>
  );
}
