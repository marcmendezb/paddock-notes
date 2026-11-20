import type { Lang } from "./constants";

/**
 * Explainers and the guide (CON-01, CON-03). An explicit index, no dynamic imports: each piece has its
 * version in every language, written separately (content.md §1.5).
 * `regulated`: depends on the regulations; reviewed at the start of each season (content.md §6).
 */
export interface Explainer {
  slug: string;
  title: Record<Lang, string>;
  /** Meta description: the text's first sentence, which answers the title's question (content.md §5.2). */
  description: Record<Lang, string>;
  regulated: boolean;
}

export const GUIDE_SLUG = "guide";

export const EXPLAINERS: Explainer[] = [
  { slug: "guide", title: { es: "Cómo entender una carrera en 10 minutos", en: "How to understand a race in 10 minutes", de: "So verstehst du ein Rennen in 10 Minuten" }, description: { es: "Una carrera de Fórmula 1 se entiende con cinco ideas: el fin de semana, los puntos, los neumáticos, las paradas y las neutralizaciones. Esta guía las explica en diez minutos.", en: "A Formula 1 race makes sense with five ideas: the weekend, points, tyres, pit stops and neutralisations. This guide explains them in ten minutes.", de: "Ein Formel-1-Rennen versteht man mit fünf Ideen: das Wochenende, die Punkte, die Reifen, die Boxenstopps und die Neutralisierungen. Dieser Leitfaden erklärt sie in zehn Minuten." }, regulated: false },
  { slug: "undercut-overcut", title: { es: "¿Qué es el undercut y el overcut?", en: "What are the undercut and overcut?", de: "Was sind Undercut und Overcut?" }, description: { es: "El undercut es parar antes que el rival para ganar tiempo con neumático nuevo; el overcut es quedarse fuera más vueltas para ganarlo con pista libre.", en: "The undercut means pitting before a rival to gain time on fresh tyres; the overcut means staying out longer to gain it in clean air.", de: "Beim Undercut stoppt man vor dem Rivalen, um mit frischen Reifen Zeit zu gewinnen; beim Overcut bleibt man länger draußen und gewinnt sie auf freier Strecke." }, regulated: false },
  { slug: "tyre-degradation", title: { es: "Por qué se degradan los neumáticos", en: "Why tyres degrade", de: "Warum Reifen abbauen" }, description: { es: "Los neumáticos se degradan porque el desgaste y la temperatura reducen su agarre vuelta a vuelta; en los tiempos se ve como una pendiente que sube.", en: "Tyres degrade because wear and temperature reduce their grip lap after lap; in lap times it shows as a rising slope.", de: "Reifen bauen ab, weil Verschleiß und Temperatur ihren Grip Runde für Runde verringern; in den Rundenzeiten sieht man das als ansteigende Kurve." }, regulated: false },
  { slug: "tyre-compounds", title: { es: "Los compuestos de neumático", en: "F1 tyre compounds", de: "Die Reifenmischungen" }, description: { es: "En seco hay tres compuestos por Gran Premio (blando, medio y duro) y dos de lluvia (intermedio y lluvia extrema); cuanto más blando, más agarre y menos duración.", en: "There are three dry compounds per Grand Prix (soft, medium and hard) and two wet ones (intermediate and full wet); softer means more grip and less life.", de: "Im Trockenen gibt es pro Grand Prix drei Mischungen (weich, mittel und hart) und zwei für Regen (Intermediate und Full Wet); je weicher, desto mehr Grip und desto kürzer die Lebensdauer." }, regulated: true },
  { slug: "qualifying", title: { es: "Cómo funciona la clasificación", en: "How qualifying works", de: "So funktioniert das Qualifying" }, description: { es: "La clasificación tiene tres fases (Q1, Q2 y Q3): en las dos primeras se eliminan los más lentos y en la última los diez restantes se juegan la pole.", en: "Qualifying has three phases (Q1, Q2 and Q3): the slowest drivers drop out in the first two, and the last ten fight for pole in Q3.", de: "Das Qualifying hat drei Phasen (Q1, Q2 und Q3): In den ersten beiden scheiden die Langsamsten aus, in der letzten kämpfen die zehn Übrigen um die Pole." }, regulated: false },
  { slug: "sprint", title: { es: "El formato sprint", en: "The sprint format", de: "Das Sprintformat" }, description: { es: "El formato sprint añade una carrera corta el sábado, con su propia clasificación, y reparte puntos a los ocho primeros.", en: "The sprint format adds a short Saturday race, with its own qualifying, that awards points to the top eight.", de: "Das Sprintformat fügt am Samstag ein kurzes Rennen mit eigenem Qualifying hinzu und vergibt Punkte an die ersten Acht." }, regulated: true },
  { slug: "safety-car", title: { es: "Safety car y VSC", en: "Safety car and VSC", de: "Safety-Car und VSC" }, description: { es: "El coche de seguridad agrupa a todos los pilotos detrás de él tras un incidente; el VSC neutraliza la carrera sin coche, obligando a todos a ir más despacio.", en: "The safety car bunches the whole field behind it after an incident; the VSC neutralises the race without a car, forcing everyone to slow down.", de: "Das Safety-Car sammelt nach einem Zwischenfall das ganze Feld hinter sich; das VSC neutralisiert das Rennen ohne Auto und zwingt alle, langsamer zu fahren." }, regulated: false },
  { slug: "dirty-air", title: { es: "El aire sucio", en: "Dirty air", de: "Verwirbelte Luft" }, description: { es: "El aire sucio es el aire turbulento que deja un coche detrás; quita carga aerodinámica al que le sigue y hace más difícil adelantar en curva.", en: "Dirty air is the turbulent air a car leaves behind; it robs the following car of downforce and makes passing in corners harder.", de: "Verwirbelte Luft ist die turbulente Luft, die ein Auto hinter sich lässt; sie nimmt dem folgenden Auto Abtrieb und erschwert das Überholen in Kurven." }, regulated: false },
  { slug: "telemetry", title: { es: "Cómo leer un gráfico de telemetría", en: "How to read telemetry", de: "So liest du Telemetrie" }, description: { es: "Un gráfico de telemetría muestra cómo va el coche a lo largo de la vuelta: velocidad, acelerador y freno; comparando dos pilotos se ve dónde gana tiempo cada uno.", en: "A telemetry chart shows how the car behaves along the lap (speed, throttle and brake); comparing two drivers shows where each one gains time.", de: "Ein Telemetriediagramm zeigt, wie sich das Auto über die Runde verhält: Geschwindigkeit, Gas und Bremse; im Vergleich zweier Fahrer sieht man, wo jeder Zeit gewinnt." }, regulated: false },
  { slug: "points", title: { es: "Cómo se reparten los puntos", en: "How points work", de: "So werden Punkte vergeben" }, description: { es: "Desde 2010 los diez primeros puntúan 25, 18, 15, 12, 10, 8, 6, 4, 2 y 1; el sistema ha cambiado varias veces desde 1950.", en: "Since 2010 the top ten score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1 points; the system has changed several times since 1950.", de: "Seit 2010 punkten die ersten Zehn mit 25, 18, 15, 12, 10, 8, 6, 4, 2 und 1 Punkten; das System hat sich seit 1950 mehrmals geändert." }, regulated: true },
  { slug: "penalties", title: { es: "Sanciones en F1", en: "F1 penalties", de: "Strafen in der F1" }, description: { es: "Las sanciones van de unos segundos añadidos al tiempo de carrera a la pérdida de posiciones en la parrilla; las deciden los comisarios de la FIA.", en: "Penalties range from a few seconds added to the race time to places lost on the grid; the FIA stewards decide them.", de: "Strafen reichen von einigen Sekunden auf die Rennzeit bis zu verlorenen Startplätzen; darüber entscheiden die FIA-Rennkommissare." }, regulated: true },
  { slug: "delta", title: { es: "Qué es el delta", en: "What is the delta", de: "Was ist das Delta" }, description: { es: "El delta es la diferencia de tiempo acumulada entre dos vueltas a lo largo del circuito: muestra en qué tramo se gana o se pierde.", en: "The delta is the accumulated time difference between two laps along the track: it shows where time is gained or lost.", de: "Das Delta ist die aufsummierte Zeitdifferenz zwischen zwei Runden entlang der Strecke: Es zeigt, wo Zeit gewonnen oder verloren wird." }, regulated: false },
  { slug: "overtake-mode", title: { es: "Del DRS al modo adelantamiento", en: "From DRS to overtake mode", de: "Vom DRS zum Überholmodus" }, description: { es: "Desde 2026 el DRS ya no existe: el coche que está a menos de un segundo del de delante recibe energía eléctrica extra para adelantar, en cualquier punto del circuito.", en: "Since 2026 DRS no longer exists: a car within one second of the car ahead gets extra electrical energy to overtake, anywhere on the track.", de: "Seit 2026 gibt es kein DRS mehr: Ein Auto, das weniger als eine Sekunde hinter dem Vordermann liegt, erhält zusätzliche elektrische Energie zum Überholen, überall auf der Strecke." }, regulated: true },
];

/** Why an explainer fits a circuit (NUC-09): the kind of race it tends to produce. */
type Trait = "sprint" | "street" | "qualifying" | "tyres" | "strategy" | "straights";

const TRAITS: Record<string, Exclude<Trait, "sprint">> = {
  // Street or semi-permanent circuits: walls close by, more safety cars.
  baku: "street",
  marina_bay: "street",
  jeddah: "street",
  vegas: "street",
  albert_park: "street",
  madring: "street",
  miami: "street",
  // Overtaking is hard: qualifying decides much of the race.
  monaco: "qualifying",
  hungaroring: "qualifying",
  zandvoort: "qualifying",
  catalunya: "qualifying",
  imola: "qualifying",
  // Abrasive asphalt or long fast corners: degradation rules.
  bahrain: "tyres",
  silverstone: "tyres",
  suzuka: "tyres",
  losail: "tyres",
  sepang: "tyres",
  shanghai: "tyres",
  americas: "tyres",
  interlagos: "tyres",
  // Stops on a knife edge: undercut and overcut.
  red_bull_ring: "strategy",
  rodriguez: "strategy",
  yas_marina: "strategy",
  villeneuve: "strategy",
  // Long straights and low downforce: overtaking depends on the extra energy.
  monza: "straights",
  spa: "straights",
};

const BY_TRAIT: Record<Trait, string> = {
  sprint: "sprint",
  street: "safety-car",
  qualifying: "qualifying",
  tyres: "tyre-degradation",
  strategy: "undercut-overcut",
  straights: "overtake-mode",
};

const REASONS: Record<Trait | "default", Record<Lang, string>> = {
  sprint: { es: "Este fin de semana hay sprint.", en: "This is a sprint weekend.", de: "Dieses Wochenende gibt es einen Sprint." },
  street: { es: "Con muros tan cerca, el coche de seguridad suele aparecer.", en: "With walls this close, the safety car often comes out.", de: "Bei so nahen Mauern kommt oft das Safety-Car." },
  qualifying: { es: "Aquí cuesta adelantar: la clasificación pesa mucho.", en: "Passing is hard here: qualifying matters a lot.", de: "Überholen ist hier schwer: Das Qualifying zählt viel." },
  tyres: { es: "Es un circuito duro con los neumáticos.", en: "This track is hard on tyres.", de: "Diese Strecke ist hart zu den Reifen." },
  strategy: { es: "Las paradas suelen decidir las posiciones.", en: "Pit stops often decide positions.", de: "Boxenstopps entscheiden hier oft die Positionen." },
  straights: { es: "Rectas largas: adelantar depende de la energía extra.", en: "Long straights: passing depends on extra energy.", de: "Lange Geraden: Überholen hängt von der Zusatzenergie ab." },
  default: { es: "Para llegar con lo básico claro.", en: "To get the basics straight first.", de: "Damit die Grundlagen sitzen." },
};

/** The explainer suggested for the next Grand Prix (NUC-09), with a sentence saying why. */
export function suggestedExplainer(circuitId: string, isSprintWeekend: boolean, lang: Lang): { explainer: Explainer; reason: string } {
  const trait: Trait | undefined = isSprintWeekend ? "sprint" : TRAITS[circuitId];
  const slug = trait ? BY_TRAIT[trait] : GUIDE_SLUG;
  return { explainer: EXPLAINERS.find((e) => e.slug === slug)!, reason: REASONS[trait ?? "default"][lang] };
}
