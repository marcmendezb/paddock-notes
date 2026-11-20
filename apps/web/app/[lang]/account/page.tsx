import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/form-message";
import { DemoForm } from "@/components/demo-form";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ msg?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return { title: dict(lang).account.title, robots: { index: false } };
}

/** Account (COM-01 to COM-03, COM-07): sign in with a magic link, profile, leagues, export and delete. */
export default async function AccountPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { msg } = await searchParams;
  const t = dict(lang).account;
  const me = await currentUser();
  const action = (name: string) => `/${lang}/forms/${name}`;

  if (!me) {
    return (
      <>
      <PageHero icon="user" size="m" kicker={t.nav} title={t.signInTitle} lede={<p>{t.signInLede}</p>} />
      <div className="container acc-card-wrap">
      <div className="acc-card">


        <FormMessage lang={lang} msg={msg} />
        {/* A demonstration, like the newsletter (D-33, D-38): no sign-ups and no emails. */}
        <DemoForm action={action("magic-link")} className="stack" notice={t.demo}>
          <input type="hidden" name="back" value="account" />
          <label className="inline-form">
            <span>{t.email}</span>
            <input type="email" name="email" required autoComplete="email" maxLength={200} />
          </label>
          <button type="submit">{t.send}</button>
          <p className="muted">{t.demoNote}</p>
        </DemoForm>
        <p className="source">
          <Link href={`/${lang}/privacy`}>{dict(lang).footer.privacy}</Link>
        </p>
      </div>
      </div>
      </>
    );
  }

  return (
    <>
      <PageHero icon="user" size="m" kicker={t.nav} title={t.title} lede={<p>{me.email}</p>} />
      <div className="container stack-xl prose acc">
      <div className="stack-s">


        <FormMessage lang={lang} msg={msg} />
      </div>

      <form action={action("profile")} method="post" className="stack">
        <input type="hidden" name="back" value="account" />
        <label className="inline-form">
          <span>{t.alias}</span>
          <input type="text" name="name" defaultValue={me.name} minLength={3} maxLength={24} required aria-describedby="alias-help" />
        </label>
        <p id="alias-help" className="muted">
          {t.aliasHelp}
        </p>
        <label className="inline-form">
          <span>{t.language}</span>
          <select name="lang" defaultValue={me.lang}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
        <button type="submit">{t.save}</button>
      </form>

      {me.quizStreak > 0 ? <p>{t.streak(me.quizStreak)}</p> : null}

      <section aria-labelledby="notifications" className="stack">
        <h2 id="notifications">{t.notificationsTitle}</h2>
        <p className="muted">{t.notificationsHelp}</p>
        <form action={action("notifications")} method="post" className="stack-s">
          <input type="hidden" name="back" value="account" />
          <label className="quiz-option">
            <input type="checkbox" name="race" defaultChecked={me.notifications.race} /> {t.notifyRace}
          </label>
          <label className="quiz-option">
            <input type="checkbox" name="analysis" defaultChecked={me.notifications.analysis} /> {t.notifyAnalysis}
          </label>
          <button type="submit">{t.save}</button>
        </form>
      </section>

      <Favorites lang={lang} selected={new Set(me.favorites)} action={action("favorites")} />

      <section aria-labelledby="leagues" className="stack">
        <h2 id="leagues">{t.leagues}</h2>
        {me.leagues.length ? (
          <ul className="link-list">
            {me.leagues.map((l) => (
              <li key={l.id}>
                <Link href={`/${lang}/leagues/${l.id}`}>{l.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.noLeagues}</p>
        )}
        <form action={action("league-create")} method="post" className="inline-form">
          <input type="hidden" name="back" value="account" />
          <label>
            {t.leagueName}
            <input type="text" name="name" minLength={3} maxLength={24} required />
          </label>
          <button type="submit">{t.create}</button>
        </form>
        <form action={action("league-join")} method="post" className="inline-form">
          <input type="hidden" name="back" value="account" />
          <label>
            {t.inviteToken}
            <input type="text" name="token" pattern="[a-f0-9]{48}" required />
          </label>
          <button type="submit">{t.join}</button>
        </form>
      </section>

      <section aria-labelledby="data" className="stack">
        <h2 id="data">{t.data}</h2>
        <p>
          <a href={`/${lang}/account/export`} download>
            {t.export}
          </a>
        </p>
        <form action={action("sign-out")} method="post">
          <input type="hidden" name="back" value="account" />
          <button type="submit">{t.signOut}</button>
        </form>
      </section>

      <section aria-labelledby="delete" className="stack">
        <h2 id="delete">{t.deleteTitle}</h2>
        <p className="muted">{t.deleteHelp}</p>
        <form action={action("delete-account")} method="post" className="stack-s">
          <input type="hidden" name="back" value="account" />
          <label className="quiz-option">
            <input type="checkbox" name="confirm" required /> {t.deleteConfirm}
          </label>
          <button type="submit">{t.delete}</button>
        </form>
      </section>
    </div>
    </>
  );
}

/** Favourites (COM-10): drivers and teams of the current season. */
async function Favorites({ lang, selected, action }: { lang: Lang; selected: Set<string>; action: string }) {
  const t = dict(lang).account;
  const [drivers, teams] = await Promise.all([
    api.driverStandings("current").catch(() => null),
    api.constructorStandings("current").catch(() => null),
  ]);
  if (!drivers && !teams) return null;
  const groups = [
    { legend: t.favDrivers, items: (drivers?.data.rows ?? []).map((r) => ({ id: `d:${r.driver.id}`, label: fullName(r.driver) })) },
    { legend: t.favTeams, items: (teams?.data.rows ?? []).map((r) => ({ id: `c:${r.constructor.id}`, label: r.constructor.name })) },
  ];
  return (
    <section aria-labelledby="favorites" className="stack">
      <h2 id="favorites">{t.favoritesTitle}</h2>
      <p className="muted">{t.favoritesHelp}</p>
      <form action={action} method="post" className="stack">
        <input type="hidden" name="back" value="account" />
        {groups.map((g) =>
          g.items.length ? (
            <fieldset key={g.legend} className="fav-group stack-s">
              <legend>{g.legend}</legend>
              <div className="check-grid">
                {g.items.map((item) => (
                  <label key={item.id} className="quiz-option">
                    <input type="checkbox" name="fav" value={item.id} defaultChecked={selected.has(item.id)} /> {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null,
        )}
        <button type="submit">{t.save}</button>
      </form>
    </section>
  );
}
