import type { Lang } from "./constants";
import type { SessionKind } from "./api";
import { suggestedExplainer } from "./explainers";
import { gpName } from "./localize";

/**
 * Emails de la newsletter (CON-06) y de los avisos (COM-11), en texto plano: se leen bien en cualquier
 * cliente y con lector de pantalla. Cada lista tiene su zona horaria por defecto (contenido.md §5.5).
 * Pie: aviso de no afiliación, baja en un clic y dirección del responsable (si está configurada).
 */

export interface EmailContent {
  subject: string;
  text: string;
}

export const LIST_TIMEZONE: Record<Lang, string> = { es: "Europe/Madrid", en: "Europe/London", de: "Europe/Berlin" };

const LOCALE: Record<Lang, string> = { es: "es-ES", en: "en-GB", de: "de-DE" };

/** Cabeceras de baja en un clic (RFC 8058): el cliente de correo hace POST a la URL sin abrir nada. */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

const SESSION_NAMES: Record<Lang, Record<SessionKind, string>> = {
  es: {
    fp1: "Libres 1",
    fp2: "Libres 2",
    fp3: "Libres 3",
    sprint_qualifying: "Clasificación sprint",
    sprint: "Sprint",
    qualifying: "Clasificación",
    race: "Carrera",
  },
  en: {
    fp1: "Practice 1",
    fp2: "Practice 2",
    fp3: "Practice 3",
    sprint_qualifying: "Sprint qualifying",
    sprint: "Sprint",
    qualifying: "Qualifying",
    race: "Race",
  },
  de: {
    fp1: "1. Training",
    fp2: "2. Training",
    fp3: "3. Training",
    sprint_qualifying: "Sprint-Qualifying",
    sprint: "Sprint",
    qualifying: "Qualifying",
    race: "Rennen",
  },
};

/** Textos de los emails en cada idioma. Los nombres y cifras se insertan; nada se traduce en tiempo real. */
const COPY = {
  es: {
    unsubscribe: (url: string) => `Darte de baja en un clic: ${url}`,
    disclaimer: "Paddock Notes es un proyecto no oficial, sin relación con Formula 1, la FIA ni ningún equipo.",
    confirmSubject: "Confirma tu suscripción a Paddock Notes",
    confirmText: (url: string) =>
      `Para recibir la newsletter de Paddock Notes, confirma que este email es tuyo:\n\n${url}\n\nEl enlace caduca en 48 horas. Si no te has apuntado tú, ignora este mensaje y no volveremos a escribirte.`,
    wins: (name: string, gp: string) => `${name} gana el ${gp}`,
    winnerLine: (name: string, team: string, gained: number | null) =>
      `${name} (${team}) gana${gained && gained > 0 ? ` remontando ${gained} ${gained === 1 ? "posición" : "posiciones"}` : ""}.`,
    podium: (a: string, b: string) => `Completan el podio ${a} y ${b}.`,
    pole: (name: string) => `La pole fue para ${name}.`,
    climb: (name: string, n: number, finish: number) => `La gran remontada: ${name}, ${n} puestos ganados hasta la P${finish}.`,
    leader: (name: string, pts: string, gap: string) => `En el Mundial manda ${name} con ${pts} puntos, ${gap} por delante del segundo.`,
    fastest: (name: string, time: string) => `Vuelta rápida: ${name}${time}.`,
    fiveLines: "LA CARRERA EN 5 LÍNEAS",
    note: "LA NOTA DE LA CARRERA",
    chart: "EL GRÁFICO DE LA SEMANA\nLa estrategia de cada piloto, vuelta a vuelta: quién paró cuándo y con qué neumáticos.",
    history: (season: number, winner: string, gp: string) => `UN DATO HISTÓRICO\nTal semana como esta, en ${season}: ${winner} ganó el ${gp}.`,
    understand: "PARA ENTENDER",
    nextUp: "PRÓXIMA CITA",
    newsletterReason: "Recibes esto porque te apuntaste a la newsletter de Paddock Notes.",
    raceNotice: (gp: string, times: string, page: string, predictions: string) =>
      `Este fin de semana se corre el ${gp}. Horarios (hora de Madrid):\n\n${times}\n\nTodo el fin de semana, en tu zona horaria: ${page}\nPredice el podio antes de la clasificación: ${predictions}`,
    raceReason: "Recibes esto porque activaste los avisos de GP en tu cuenta.",
    raceSubject: (gp: string) => `Este fin de semana: ${gp}`,
    analysis: (gp: string, url: string) =>
      `Ya está el análisis del ${gp}: estrategias, ritmo por vuelta, sectores, telemetría y la carrera vuelta a vuelta.\n\n${url}`,
    analysisReason: "Recibes esto porque activaste los avisos de análisis en tu cuenta.",
    analysisSubject: (gp: string) => `Análisis del ${gp}`,
  },
  en: {
    unsubscribe: (url: string) => `Unsubscribe in one click: ${url}`,
    disclaimer: "Paddock Notes is an unofficial project, not associated with Formula 1, the FIA or any team.",
    confirmSubject: "Confirm your Paddock Notes subscription",
    confirmText: (url: string) =>
      `To get the Paddock Notes newsletter, confirm this email is yours:\n\n${url}\n\nThe link expires in 48 hours. If you didn't sign up, ignore this message and we won't write again.`,
    wins: (name: string, gp: string) => `${name} wins the ${gp}`,
    winnerLine: (name: string, team: string, gained: number | null) =>
      `${name} (${team}) wins${gained && gained > 0 ? `, gaining ${gained} ${gained === 1 ? "place" : "places"}` : ""}.`,
    podium: (a: string, b: string) => `${a} and ${b} complete the podium.`,
    pole: (name: string) => `${name} started from pole.`,
    climb: (name: string, n: number, finish: number) => `Biggest climb: ${name}, up ${n} places to P${finish}.`,
    leader: (name: string, pts: string, gap: string) => `${name} leads the championship on ${pts} points, ${gap} clear of second.`,
    fastest: (name: string, time: string) => `Fastest lap: ${name}${time}.`,
    fiveLines: "THE RACE IN 5 LINES",
    note: "THE RACE NOTE",
    chart: "CHART OF THE WEEK\nEvery driver's strategy, lap by lap: who stopped when and on which tyres.",
    history: (season: number, winner: string, gp: string) => `FROM THE ARCHIVE\nThis week in ${season}: ${winner} won the ${gp}.`,
    understand: "TO UNDERSTAND IT",
    nextUp: "NEXT UP",
    newsletterReason: "You're getting this because you signed up for the Paddock Notes newsletter.",
    raceNotice: (gp: string, times: string, page: string, predictions: string) =>
      `The ${gp} is this weekend. Times (London time):\n\n${times}\n\nThe whole weekend, in your time zone: ${page}\nPredict the podium before qualifying: ${predictions}`,
    raceReason: "You're getting this because you turned on race reminders in your account.",
    raceSubject: (gp: string) => `This weekend: ${gp}`,
    analysis: (gp: string, url: string) => `The ${gp} analysis is out: strategies, lap-by-lap pace, sectors, telemetry and the race replay.\n\n${url}`,
    analysisReason: "You're getting this because you turned on analysis alerts in your account.",
    analysisSubject: (gp: string) => `${gp} analysis`,
  },
  de: {
    unsubscribe: (url: string) => `Mit einem Klick abmelden: ${url}`,
    disclaimer: "Paddock Notes ist ein inoffizielles Projekt ohne Verbindung zur Formel 1, zur FIA oder zu einem Team.",
    confirmSubject: "Bestätige dein Abo von Paddock Notes",
    confirmText: (url: string) =>
      `Um den Newsletter von Paddock Notes zu erhalten, bestätige, dass diese E-Mail-Adresse dir gehört:\n\n${url}\n\nDer Link läuft in 48 Stunden ab. Wenn du dich nicht angemeldet hast, ignoriere diese Nachricht; wir schreiben dir dann nicht wieder.`,
    wins: (name: string, gp: string) => `${name} gewinnt den ${gp}`,
    winnerLine: (name: string, team: string, gained: number | null) =>
      `${name} (${team}) gewinnt${gained && gained > 0 ? ` und macht ${gained} ${gained === 1 ? "Platz" : "Plätze"} gut` : ""}.`,
    podium: (a: string, b: string) => `${a} und ${b} komplettieren das Podium.`,
    pole: (name: string) => `Die Pole ging an ${name}.`,
    climb: (name: string, n: number, finish: number) => `Größte Aufholjagd: ${name}, ${n} Plätze gutgemacht bis P${finish}.`,
    leader: (name: string, pts: string, gap: string) => `In der WM führt ${name} mit ${pts} Punkten, ${gap} vor dem Zweiten.`,
    fastest: (name: string, time: string) => `Schnellste Runde: ${name}${time}.`,
    fiveLines: "DAS RENNEN IN 5 ZEILEN",
    note: "DIE RENNNOTIZ",
    chart: "GRAFIK DER WOCHE\nDie Strategie jedes Fahrers, Runde für Runde: wer wann auf welche Reifen gewechselt hat.",
    history: (season: number, winner: string, gp: string) => `AUS DEM ARCHIV\nIn dieser Woche im Jahr ${season}: ${winner} gewann den ${gp}.`,
    understand: "ZUM VERSTEHEN",
    nextUp: "NÄCHSTER TERMIN",
    newsletterReason: "Du erhältst diese E-Mail, weil du dich für den Newsletter von Paddock Notes angemeldet hast.",
    raceNotice: (gp: string, times: string, page: string, predictions: string) =>
      `An diesem Wochenende steht der ${gp} an. Zeiten (Berliner Zeit):\n\n${times}\n\nDas ganze Wochenende in deiner Zeitzone: ${page}\nTippe das Podium vor dem Qualifying: ${predictions}`,
    raceReason: "Du erhältst diese E-Mail, weil du in deinem Konto die GP-Erinnerungen aktiviert hast.",
    raceSubject: (gp: string) => `An diesem Wochenende: ${gp}`,
    analysis: (gp: string, url: string) =>
      `Die Analyse zum ${gp} ist da: Strategien, Pace pro Runde, Sektoren, Telemetrie und das Rennen Runde für Runde.\n\n${url}`,
    analysisReason: "Du erhältst diese E-Mail, weil du in deinem Konto die Analyse-Benachrichtigungen aktiviert hast.",
    analysisSubject: (gp: string) => `Analyse: ${gp}`,
  },
} satisfies Record<Lang, Record<string, unknown>>;

function when(lang: Lang, iso: string): string {
  const text = new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: LIST_TIMEZONE[lang],
    timeZoneName: "short",
  }).format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function footer(lang: Lang, unsubscribeUrl: string, postalAddress: string, reason: string): string {
  const c = COPY[lang];
  const lines = [reason, c.unsubscribe(unsubscribeUrl), c.disclaimer];
  if (postalAddress) lines.push(postalAddress);
  return `\n\n—\n${lines.join("\n")}`;
}

export function newsletterConfirmEmail(lang: Lang, confirmUrl: string): EmailContent {
  return { subject: COPY[lang].confirmSubject, text: COPY[lang].confirmText(confirmUrl) };
}

/** Datos de una edición, sin idioma: la plantilla los pone en el idioma de cada lista. */
export interface RaceDigest {
  season: number;
  round: number;
  gp: string;
  podium: { name: string; team: string; gained: number | null }[];
  pole: string | null;
  fastestLap: { name: string; time: string | null } | null;
  biggestGain: { name: string; gained: number; finish: number } | null;
  leader: { name: string; points: number; gap: number } | null;
  hasAnalysis: boolean;
  /** Nota post-carrera publicada (CON-04), si la hay. */
  note: { slug: string; title: Record<Lang, string> } | null;
  history: { season: number; gp: string; winner: string } | null;
  next: { season: number; round: number; gp: string; circuitId: string; isSprintWeekend: boolean; raceStart: string | null } | null;
}

function points(lang: Lang, n: number): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** Newsletter semanal tras cada carrera (contenido.md §5.5). */
export function newsletterEmail(lang: Lang, d: RaceDigest, siteUrl: string, unsubscribeUrl: string, postalAddress: string): EmailContent {
  const c = COPY[lang];
  const gp = gpName(lang, d.gp);
  const raceUrl = `${siteUrl}/${lang}/races/${d.season}/${d.round}`;
  const [winner, second, third] = d.podium;
  const subject = winner ? c.wins(winner.name, gp) : gp;

  const summary: string[] = [];
  if (winner) summary.push(c.winnerLine(winner.name, winner.team, winner.gained));
  if (second && third) summary.push(c.podium(second.name, third.name));
  if (d.pole) summary.push(c.pole(d.pole));
  if (d.biggestGain) summary.push(c.climb(d.biggestGain.name, d.biggestGain.gained, d.biggestGain.finish));
  if (d.leader) summary.push(c.leader(d.leader.name, points(lang, d.leader.points), points(lang, d.leader.gap)));
  // Cinco líneas como máximo: la vuelta rápida (sin punto desde 2025) es la primera que sobra.
  if (d.fastestLap) summary.push(c.fastest(d.fastestLap.name, d.fastestLap.time ? ` (${d.fastestLap.time})` : ""));

  const sections: string[] = [];
  sections.push(`${c.fiveLines}\n${summary.slice(0, 5).join("\n")}\n${raceUrl}`);
  if (d.note) sections.push(`${c.note}\n${d.note.title[lang]}\n${siteUrl}/${lang}/notes/${d.note.slug}`);
  if (d.hasAnalysis) sections.push(`${c.chart}\n${siteUrl}/${lang}/analysis/${d.season}/${d.round}/strategy`);
  if (d.history) sections.push(c.history(d.history.season, d.history.winner, gpName(lang, d.history.gp)));
  if (d.next) {
    const { explainer, reason } = suggestedExplainer(d.next.circuitId, d.next.isSprintWeekend, lang);
    sections.push(`${c.understand}\n${explainer.title[lang]}. ${reason}\n${siteUrl}/${lang}/learn/${explainer.slug}`);
    const nextGp = gpName(lang, d.next.gp);
    sections.push(
      `${c.nextUp}\n${nextGp}${d.next.raceStart ? `: ${when(lang, d.next.raceStart)}` : ""}\n${siteUrl}/${lang}/races/${d.next.season}/${d.next.round}`,
    );
  }
  return { subject: subject.slice(0, 78), text: sections.join("\n\n") + footer(lang, unsubscribeUrl, postalAddress, c.newsletterReason) };
}

export interface RaceNotice {
  season: number;
  round: number;
  gp: string;
  sessions: { kind: SessionKind; startsAt: string | null }[];
}

/** Aviso antes de cada GP (COM-11): horarios en la zona de la lista y enlace al calendario .ics. */
export function raceNoticeEmail(lang: Lang, n: RaceNotice, siteUrl: string, unsubscribeUrl: string, postalAddress: string): EmailContent {
  const c = COPY[lang];
  const gp = gpName(lang, n.gp);
  const times = n.sessions
    .filter((s) => s.startsAt)
    .map((s) => `${SESSION_NAMES[lang][s.kind]}: ${when(lang, s.startsAt!)}`)
    .join("\n");
  const page = `${siteUrl}/${lang}/races/${n.season}/${n.round}`;
  const body = c.raceNotice(gp, times, page, `${siteUrl}/${lang}/predictions`);
  return { subject: c.raceSubject(gp), text: body + footer(lang, unsubscribeUrl, postalAddress, c.raceReason) };
}

/** Aviso al publicar el análisis técnico de una carrera (COM-11). */
export function analysisNoticeEmail(
  lang: Lang,
  n: { season: number; round: number; gp: string },
  siteUrl: string,
  unsubscribeUrl: string,
  postalAddress: string,
): EmailContent {
  const c = COPY[lang];
  const gp = gpName(lang, n.gp);
  const url = `${siteUrl}/${lang}/analysis/${n.season}/${n.round}/strategy`;
  return { subject: c.analysisSubject(gp), text: c.analysis(gp, url) + footer(lang, unsubscribeUrl, postalAddress, c.analysisReason) };
}
