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

export const LIST_TIMEZONE: Record<Lang, string> = { es: "Europe/Madrid", en: "Europe/London" };

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
};

function when(lang: Lang, iso: string): string {
  const text = new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-GB", {
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
  const lines =
    lang === "es"
      ? [reason, `Darte de baja en un clic: ${unsubscribeUrl}`, "Paddock Notes es un proyecto no oficial, sin relación con Formula 1, la FIA ni ningún equipo."]
      : [reason, `Unsubscribe in one click: ${unsubscribeUrl}`, "Paddock Notes is an unofficial project, not associated with Formula 1, the FIA or any team."];
  if (postalAddress) lines.push(postalAddress);
  return `\n\n—\n${lines.join("\n")}`;
}

export function newsletterConfirmEmail(lang: Lang, confirmUrl: string): EmailContent {
  return lang === "es"
    ? {
        subject: "Confirma tu suscripción a Paddock Notes",
        text: `Para recibir la newsletter de Paddock Notes, confirma que este email es tuyo:\n\n${confirmUrl}\n\nEl enlace caduca en 48 horas. Si no te has apuntado tú, ignora este mensaje y no volveremos a escribirte.`,
      }
    : {
        subject: "Confirm your Paddock Notes subscription",
        text: `To get the Paddock Notes newsletter, confirm this email is yours:\n\n${confirmUrl}\n\nThe link expires in 48 hours. If you didn't sign up, ignore this message and we won't write again.`,
      };
}

/** Datos de una edición, sin idioma: la plantilla los pone en ES o en EN. */
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
  history: { season: number; gp: string; winner: string } | null;
  next: { season: number; round: number; gp: string; circuitId: string; isSprintWeekend: boolean; raceStart: string | null } | null;
}

function points(lang: Lang, n: number): string {
  return new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB").format(n);
}

/** Newsletter semanal tras cada carrera (contenido.md §5.5). */
export function newsletterEmail(lang: Lang, d: RaceDigest, siteUrl: string, unsubscribeUrl: string, postalAddress: string): EmailContent {
  const es = lang === "es";
  const gp = gpName(lang, d.gp);
  const raceUrl = `${siteUrl}/${lang}/races/${d.season}/${d.round}`;
  const [winner, second, third] = d.podium;
  const subject = winner
    ? es
      ? `${winner.name} gana el ${gp}`
      : `${winner.name} wins the ${gp}`
    : gp;

  const summary: string[] = [];
  if (winner) {
    summary.push(
      es
        ? `${winner.name} (${winner.team}) gana${winner.gained && winner.gained > 0 ? ` remontando ${winner.gained} ${winner.gained === 1 ? "posición" : "posiciones"}` : ""}.`
        : `${winner.name} (${winner.team}) wins${winner.gained && winner.gained > 0 ? `, gaining ${winner.gained} ${winner.gained === 1 ? "place" : "places"}` : ""}.`,
    );
  }
  if (second && third) summary.push(es ? `Completan el podio ${second.name} y ${third.name}.` : `${second.name} and ${third.name} complete the podium.`);
  if (d.pole) summary.push(es ? `La pole fue para ${d.pole}.` : `${d.pole} started from pole.`);
  if (d.biggestGain) {
    summary.push(
      es
        ? `La gran remontada: ${d.biggestGain.name}, ${d.biggestGain.gained} puestos ganados hasta la P${d.biggestGain.finish}.`
        : `Biggest climb: ${d.biggestGain.name}, up ${d.biggestGain.gained} places to P${d.biggestGain.finish}.`,
    );
  }
  if (d.leader) {
    summary.push(
      es
        ? `En el Mundial manda ${d.leader.name} con ${points(lang, d.leader.points)} puntos, ${points(lang, d.leader.gap)} por delante del segundo.`
        : `${d.leader.name} leads the championship on ${points(lang, d.leader.points)} points, ${points(lang, d.leader.gap)} clear of second.`,
    );
  }

  // Cinco líneas como máximo: la vuelta rápida (sin punto desde 2025) es la primera que sobra.
  if (d.fastestLap) {
    summary.push(es ? `Vuelta rápida: ${d.fastestLap.name}${d.fastestLap.time ? ` (${d.fastestLap.time})` : ""}.` : `Fastest lap: ${d.fastestLap.name}${d.fastestLap.time ? ` (${d.fastestLap.time})` : ""}.`);
  }
  const sections: string[] = [];
  sections.push(`${es ? "LA CARRERA EN 5 LÍNEAS" : "THE RACE IN 5 LINES"}\n${summary.slice(0, 5).join("\n")}\n${raceUrl}`);
  if (d.hasAnalysis) {
    sections.push(
      es
        ? `EL GRÁFICO DE LA SEMANA\nLa estrategia de cada piloto, vuelta a vuelta: quién paró cuándo y con qué neumáticos.\n${siteUrl}/es/analysis/${d.season}/${d.round}/strategy`
        : `CHART OF THE WEEK\nEvery driver's strategy, lap by lap: who stopped when and on which tyres.\n${siteUrl}/en/analysis/${d.season}/${d.round}/strategy`,
    );
  }
  if (d.history) {
    sections.push(
      es
        ? `UN DATO HISTÓRICO\nTal semana como esta, en ${d.history.season}: ${d.history.winner} ganó el ${gpName("es", d.history.gp)}.`
        : `FROM THE ARCHIVE\nThis week in ${d.history.season}: ${d.history.winner} won the ${d.history.gp}.`,
    );
  }
  if (d.next) {
    const { explainer, reason } = suggestedExplainer(d.next.circuitId, d.next.isSprintWeekend, lang);
    sections.push(`${es ? "PARA ENTENDER" : "TO UNDERSTAND IT"}\n${explainer.title[lang]}. ${reason}\n${siteUrl}/${lang}/learn/${explainer.slug}`);
    const nextGp = gpName(lang, d.next.gp);
    sections.push(
      `${es ? "PRÓXIMA CITA" : "NEXT UP"}\n${nextGp}${d.next.raceStart ? `: ${when(lang, d.next.raceStart)}` : ""}\n${siteUrl}/${lang}/races/${d.next.season}/${d.next.round}`,
    );
  }

  const reason = es ? "Recibes esto porque te apuntaste a la newsletter de Paddock Notes." : "You're getting this because you signed up for the Paddock Notes newsletter.";
  return { subject: subject.slice(0, 78), text: sections.join("\n\n") + footer(lang, unsubscribeUrl, postalAddress, reason) };
}

export interface RaceNotice {
  season: number;
  round: number;
  gp: string;
  sessions: { kind: SessionKind; startsAt: string | null }[];
}

/** Aviso antes de cada GP (COM-11): horarios en la zona de la lista y enlace al calendario .ics. */
export function raceNoticeEmail(lang: Lang, n: RaceNotice, siteUrl: string, unsubscribeUrl: string, postalAddress: string): EmailContent {
  const es = lang === "es";
  const gp = gpName(lang, n.gp);
  const times = n.sessions
    .filter((s) => s.startsAt)
    .map((s) => `${SESSION_NAMES[lang][s.kind]}: ${when(lang, s.startsAt!)}`)
    .join("\n");
  const page = `${siteUrl}/${lang}/races/${n.season}/${n.round}`;
  const body = es
    ? `Este fin de semana se corre el ${gp}. Horarios (hora de Madrid):\n\n${times}\n\nTodo el fin de semana, en tu zona horaria: ${page}\nPredice el podio antes de la clasificación: ${siteUrl}/es/predictions`
    : `The ${gp} is this weekend. Times (London time):\n\n${times}\n\nThe whole weekend, in your time zone: ${page}\nPredict the podium before qualifying: ${siteUrl}/en/predictions`;
  const reason = es ? "Recibes esto porque activaste los avisos de GP en tu cuenta." : "You're getting this because you turned on race reminders in your account.";
  return { subject: es ? `Este fin de semana: ${gp}` : `This weekend: ${gp}`, text: body + footer(lang, unsubscribeUrl, postalAddress, reason) };
}

/** Aviso al publicar el análisis técnico de una carrera (COM-11). */
export function analysisNoticeEmail(
  lang: Lang,
  n: { season: number; round: number; gp: string },
  siteUrl: string,
  unsubscribeUrl: string,
  postalAddress: string,
): EmailContent {
  const es = lang === "es";
  const gp = gpName(lang, n.gp);
  const url = `${siteUrl}/${lang}/analysis/${n.season}/${n.round}/strategy`;
  const body = es
    ? `Ya está el análisis del ${gp}: estrategias, ritmo por vuelta, sectores, telemetría y la carrera vuelta a vuelta.\n\n${url}`
    : `The ${gp} analysis is out: strategies, lap-by-lap pace, sectors, telemetry and the race replay.\n\n${url}`;
  const reason = es ? "Recibes esto porque activaste los avisos de análisis en tu cuenta." : "You're getting this because you turned on analysis alerts in your account.";
  return { subject: es ? `Análisis del ${gp}` : `${gp} analysis`, text: body + footer(lang, unsubscribeUrl, postalAddress, reason) };
}
