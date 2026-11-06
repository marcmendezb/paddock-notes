import type { Lang } from "@paddock/shared";

/**
 * Glosario (CON-02, contenido.md §7): 60 términos en ES y EN, escritos por separado.
 * `regulated`: depende del reglamento vigente; se revisa al inicio de cada temporada (contenido.md §6).
 */

interface Entry {
  term: string;
  def: string;
  example?: string;
}

export interface GlossaryTerm {
  slug: string;
  group: GroupKey;
  regulated?: boolean;
  explainer?: string;
  see?: string[];
  es: Entry;
  en: Entry;
}

export type GroupKey = "race" | "tyres" | "aero" | "rules" | "timing" | "paddock";

export const GROUPS: Record<GroupKey, Record<Lang, string>> = {
  race: { es: "Carrera y estrategia", en: "Race and strategy" },
  tyres: { es: "Neumáticos", en: "Tyres" },
  aero: { es: "Aerodinámica y coche", en: "Aerodynamics and car" },
  rules: { es: "Reglamento", en: "Rules" },
  timing: { es: "Timing y datos", en: "Timing and data" },
  paddock: { es: "Paddock y fin de semana", en: "Paddock and race weekend" },
};

export const GLOSSARY: GlossaryTerm[] = [
  // ---- Carrera y estrategia -----------------------------------------------------------------
  {
    slug: "undercut",
    group: "race",
    explainer: "undercut-overcut",
    see: ["overcut", "pit-stop", "out-lap"],
    es: { term: "Undercut", def: "Parar antes que el rival para aprovechar el neumático nuevo y adelantarle cuando él pare.", example: "Russell paró dos vueltas antes y salió por delante de Norris." },
    en: { term: "Undercut", def: "Pitting before a rival to use the fresh tyres and get ahead when they stop.", example: "Russell stopped two laps earlier and came out ahead of Norris." },
  },
  {
    slug: "overcut",
    group: "race",
    explainer: "undercut-overcut",
    see: ["undercut", "pit-window"],
    es: { term: "Overcut", def: "Quedarse fuera más vueltas que el rival para rodar con pista libre y ganar la posición al parar después." },
    en: { term: "Overcut", def: "Staying out longer than a rival to run in clean air and gain the place by stopping later." },
  },
  {
    slug: "stint",
    group: "race",
    see: ["pit-stop", "degradation"],
    es: { term: "Stint", def: "Tramo de carrera entre dos paradas, con un mismo juego de neumáticos." },
    en: { term: "Stint", def: "A stretch of the race between two stops, on the same set of tyres." },
  },
  {
    slug: "pit-stop",
    group: "race",
    see: ["stint", "double-stack", "undercut"],
    es: { term: "Parada en boxes", def: "Entrada al pit lane para cambiar neumáticos o reparar el coche. Cuesta unos 20 segundos entre entrada, parada y salida." },
    en: { term: "Pit stop", def: "A visit to the pit lane to change tyres or repair the car. Entry, stop and exit cost around 20 seconds." },
  },
  {
    slug: "pit-window",
    group: "race",
    see: ["undercut", "overcut"],
    es: { term: "Ventana de parada", def: "Vueltas en las que parar tiene sentido estratégico: ni tan pronto que el neumático no aguante, ni tan tarde que se pierda tiempo." },
    en: { term: "Pit window", def: "The laps in which stopping makes strategic sense: not so early that the tyres won't last, not so late that time is lost." },
  },
  {
    slug: "double-stack",
    group: "race",
    see: ["pit-stop"],
    es: { term: "Doble parada (double stack)", def: "Parada de los dos coches de un equipo en la misma vuelta, uno detrás del otro." },
    en: { term: "Double stack", def: "Both cars of a team pitting on the same lap, one behind the other." },
  },
  {
    slug: "team-orders",
    group: "race",
    es: { term: "Órdenes de equipo", def: "Instrucciones del equipo a sus pilotos, por ejemplo para que uno deje pasar al otro." },
    en: { term: "Team orders", def: "Instructions from a team to its drivers, for example to let the other car through." },
  },
  {
    slug: "safety-car",
    group: "race",
    explainer: "safety-car",
    see: ["virtual-safety-car", "red-flag"],
    es: { term: "Coche de seguridad", def: "Coche que sale a pista tras un incidente para agrupar a los pilotos y neutralizar la carrera.", example: "Una parada bajo coche de seguridad cuesta mucho menos tiempo." },
    en: { term: "Safety car", def: "A car sent onto the track after an incident to bunch the field and neutralise the race.", example: "A stop under the safety car costs much less time." },
  },
  {
    slug: "virtual-safety-car",
    group: "race",
    explainer: "safety-car",
    see: ["safety-car", "delta"],
    es: { term: "Coche de seguridad virtual (VSC)", def: "Neutralización sin coche en pista: todos deben respetar un tiempo mínimo por tramo, así que se mantienen las distancias." },
    en: { term: "Virtual safety car (VSC)", def: "A neutralisation without a car on track: everyone must respect a minimum time per section, so gaps are kept." },
  },
  {
    slug: "red-flag",
    group: "race",
    see: ["safety-car"],
    es: { term: "Bandera roja", def: "Interrupción de la sesión: los coches entran al pit lane y la carrera se reanuda cuando la pista es segura." },
    en: { term: "Red flag", def: "The session is stopped: cars return to the pit lane and the race restarts once the track is safe." },
  },
  {
    slug: "formation-lap",
    group: "race",
    see: ["starting-grid"],
    es: { term: "Vuelta de formación", def: "Vuelta previa a la salida para calentar neumáticos y frenos y ocupar las posiciones de la parrilla." },
    en: { term: "Formation lap", def: "The lap before the start, used to warm tyres and brakes and line up on the grid." },
  },
  // ---- Neumáticos ------------------------------------------------------------------------------
  {
    slug: "compound",
    group: "tyres",
    explainer: "tyre-compounds",
    see: ["dry-tyres", "two-compound-rule"],
    es: { term: "Compuesto", def: "Tipo de goma del neumático. Cuanto más blando, más agarre y menos duración." },
    en: { term: "Compound", def: "The rubber type of a tyre. Softer means more grip and less life." },
  },
  {
    slug: "dry-tyres",
    group: "tyres",
    explainer: "tyre-compounds",
    see: ["compound", "degradation"],
    es: { term: "Neumático blando, medio y duro", def: "Los tres compuestos de seco que se llevan a cada Gran Premio, elegidos de una gama más amplia según el circuito." },
    en: { term: "Soft, medium and hard tyres", def: "The three dry compounds brought to each Grand Prix, picked from a wider range for each circuit." },
  },
  {
    slug: "intermediate-tyre",
    group: "tyres",
    explainer: "tyre-compounds",
    see: ["full-wet-tyre"],
    es: { term: "Neumático intermedio", def: "Neumático con dibujo para pista húmeda o con poca agua." },
    en: { term: "Intermediate tyre", def: "A grooved tyre for a damp track or light standing water." },
  },
  {
    slug: "full-wet-tyre",
    group: "tyres",
    explainer: "tyre-compounds",
    see: ["intermediate-tyre"],
    es: { term: "Neumático de lluvia extrema", def: "Neumático con más dibujo para evacuar mucha agua en lluvia intensa." },
    en: { term: "Full wet tyre", def: "A tyre with deeper grooves to clear heavy standing water." },
  },
  {
    slug: "degradation",
    group: "tyres",
    explainer: "tyre-degradation",
    see: ["graining", "blistering", "tyre-cliff"],
    es: { term: "Degradación", def: "Pérdida de rendimiento del neumático vuelta a vuelta. Se ve como una pendiente ascendente en los tiempos.", example: "Una degradación de 0,1 s por vuelta suma 2 s en 20 vueltas." },
    en: { term: "Degradation", def: "The tyre's loss of performance lap after lap. It shows as a rising slope in lap times.", example: "Degradation of 0.1 s per lap adds up to 2 s over 20 laps." },
  },
  {
    slug: "graining",
    group: "tyres",
    explainer: "tyre-degradation",
    es: { term: "Graining", def: "Pequeñas bolitas de goma que se forman en la superficie del neumático cuando desliza y reducen el agarre." },
    en: { term: "Graining", def: "Small rubber pellets that form on the tyre surface when it slides, reducing grip." },
  },
  {
    slug: "blistering",
    group: "tyres",
    explainer: "tyre-degradation",
    es: { term: "Blistering", def: "Ampollas por exceso de temperatura dentro del neumático. Arranca trozos de goma y obliga a parar." },
    en: { term: "Blistering", def: "Blisters caused by overheating inside the tyre. Chunks of rubber come off and force a stop." },
  },
  {
    slug: "operating-window",
    group: "tyres",
    explainer: "tyre-degradation",
    es: { term: "Ventana de funcionamiento", def: "Rango de temperatura en el que el neumático da su mejor agarre." },
    en: { term: "Operating window", def: "The temperature range in which a tyre gives its best grip." },
  },
  {
    slug: "tyre-cliff",
    group: "tyres",
    explainer: "tyre-degradation",
    es: { term: "Caída de rendimiento (cliff)", def: "Momento en que el neumático deja de rendir de golpe y los tiempos suben varios segundos." },
    en: { term: "Tyre cliff", def: "The point where a tyre suddenly stops working and lap times jump by seconds." },
  },
  {
    slug: "two-compound-rule",
    group: "tyres",
    regulated: true,
    explainer: "tyre-compounds",
    es: { term: "Regla de los dos compuestos", def: "En carrera en seco hay que usar al menos dos compuestos de seco distintos, salvo que se usen neumáticos de lluvia." },
    en: { term: "Two-compound rule", def: "In a dry race, drivers must use at least two different dry compounds, unless wet-weather tyres are used." },
  },
  // ---- Aerodinámica y coche --------------------------------------------------------------------
  {
    slug: "downforce",
    group: "aero",
    see: ["drag", "dirty-air"],
    es: { term: "Carga aerodinámica", def: "Fuerza hacia abajo que genera el aire sobre el coche. Da agarre en curva." },
    en: { term: "Downforce", def: "The downward force the air creates on the car. It gives grip in corners." },
  },
  {
    slug: "drag",
    group: "aero",
    see: ["downforce", "slipstream"],
    es: { term: "Resistencia aerodinámica", def: "Fuerza del aire que frena el coche. Más carga suele significar más resistencia en recta." },
    en: { term: "Drag", def: "The air force slowing the car. More downforce usually means more drag on the straights." },
  },
  {
    slug: "dirty-air",
    group: "aero",
    explainer: "dirty-air",
    see: ["downforce", "slipstream"],
    es: { term: "Aire sucio", def: "Aire turbulento detrás de un coche. Quita carga al que le sigue y hace más difícil adelantar en curva." },
    en: { term: "Dirty air", def: "Turbulent air behind a car. It robs the following car of downforce and makes passing in corners harder." },
  },
  {
    slug: "slipstream",
    group: "aero",
    see: ["drag", "dirty-air"],
    es: { term: "Rebufo", def: "Zona de menos resistencia detrás de un coche en recta: el que sigue gana velocidad." },
    en: { term: "Slipstream (tow)", def: "The low-drag pocket behind a car on a straight: the follower gains speed." },
  },
  {
    slug: "ground-effect",
    group: "aero",
    see: ["downforce", "porpoising"],
    es: { term: "Efecto suelo", def: "Carga generada por el aire que pasa bajo el coche, acelerado por la forma del fondo plano." },
    en: { term: "Ground effect", def: "Downforce created by air flowing under the car, sped up by the shape of the floor." },
  },
  {
    slug: "porpoising",
    group: "aero",
    see: ["ground-effect"],
    es: { term: "Porpoising", def: "Rebote del coche a alta velocidad cuando el fondo pierde y recupera carga una y otra vez." },
    en: { term: "Porpoising", def: "The car bouncing at high speed as the floor repeatedly loses and regains downforce." },
  },
  {
    slug: "front-wing",
    group: "aero",
    es: { term: "Alerón delantero", def: "Primera pieza que corta el aire: genera carga y dirige el flujo hacia el resto del coche." },
    en: { term: "Front wing", def: "The first part to meet the air: it creates downforce and guides the flow to the rest of the car." },
  },
  {
    slug: "rear-wing",
    group: "aero",
    see: ["overtake-mode"],
    es: { term: "Alerón trasero", def: "Genera carga en el eje trasero. Su ajuste es un compromiso entre agarre en curva y velocidad punta." },
    en: { term: "Rear wing", def: "Creates downforce at the rear axle. Its setting trades corner grip for top speed." },
  },
  {
    slug: "diffuser",
    group: "aero",
    see: ["ground-effect"],
    es: { term: "Difusor", def: "Parte trasera del fondo que expande el aire de debajo del coche y aumenta la carga." },
    en: { term: "Diffuser", def: "The rear section of the floor that expands the air from under the car and increases downforce." },
  },
  {
    slug: "overtake-mode",
    group: "aero",
    regulated: true,
    explainer: "overtake-mode",
    see: ["slipstream"],
    es: { term: "Modo adelantamiento (antes, DRS)", def: "Desde 2026, energía eléctrica extra para el coche que está a menos de un segundo del de delante. Sustituye al DRS (2011–2025), que abría el alerón trasero en zonas fijas." },
    en: { term: "Overtake mode (formerly DRS)", def: "Since 2026, extra electrical energy for a car within one second of the car ahead. It replaces DRS (2011–2025), which opened the rear wing in fixed zones." },
  },
  // ---- Reglamento -----------------------------------------------------------------------------
  {
    slug: "parc-ferme",
    group: "rules",
    regulated: true,
    explainer: "sprint",
    es: { term: "Parque cerrado", def: "Periodo en el que los equipos no pueden cambiar la puesta a punto del coche, salvo excepciones." },
    en: { term: "Parc fermé", def: "A period in which teams cannot change the car's set-up, with limited exceptions." },
  },
  {
    slug: "track-limits",
    group: "rules",
    explainer: "penalties",
    es: { term: "Límites de pista", def: "Los bordes de la pista. Salirse con las cuatro ruedas anula la vuelta y, si se repite, conlleva sanción." },
    en: { term: "Track limits", def: "The edges of the track. Leaving it with all four wheels deletes the lap and, if repeated, brings a penalty." },
  },
  {
    slug: "time-penalty",
    group: "rules",
    regulated: true,
    explainer: "penalties",
    es: { term: "Penalización de 5 y 10 segundos", def: "Tiempo que se suma: se cumple parado en la siguiente parada o se añade al resultado final." },
    en: { term: "5- and 10-second penalty", def: "Time added: served stationary at the next stop or added to the final result." },
  },
  {
    slug: "drive-through",
    group: "rules",
    explainer: "penalties",
    es: { term: "Drive-through", def: "Sanción que obliga a cruzar el pit lane sin parar." },
    en: { term: "Drive-through penalty", def: "A penalty that forces the driver to go through the pit lane without stopping." },
  },
  {
    slug: "stop-and-go",
    group: "rules",
    explainer: "penalties",
    es: { term: "Stop-and-go", def: "Sanción que obliga a entrar en boxes y quedarse parado 10 segundos, sin trabajar en el coche." },
    en: { term: "Stop-and-go penalty", def: "A penalty that forces the driver to stop in the pits for 10 seconds, with no work on the car." },
  },
  {
    slug: "grid-penalty",
    group: "rules",
    explainer: "penalties",
    es: { term: "Penalización de parrilla", def: "Retroceso de posiciones en la parrilla de salida, por ejemplo por cambiar piezas del motor por encima del cupo." },
    en: { term: "Grid penalty", def: "Places lost on the starting grid, for example for using more engine parts than allowed." },
  },
  {
    slug: "penalty-points",
    group: "rules",
    regulated: true,
    explainer: "penalties",
    es: { term: "Puntos de superlicencia", def: "Puntos de sanción que se acumulan en la licencia del piloto. Con 12 en 12 meses, se pierde una carrera." },
    en: { term: "Penalty points (super licence)", def: "Penalty points added to a driver's licence. Reaching 12 within 12 months means a race ban." },
  },
  {
    slug: "cost-cap",
    group: "rules",
    regulated: true,
    es: { term: "Límite de presupuesto", def: "Tope de gasto anual de cada equipo, con exclusiones como los sueldos de los pilotos." },
    en: { term: "Cost cap", def: "Each team's annual spending limit, with exclusions such as driver salaries." },
  },
  {
    slug: "stewards",
    group: "rules",
    explainer: "penalties",
    es: { term: "Comisarios", def: "Jueces de la FIA que investigan incidentes y deciden las sanciones." },
    en: { term: "Stewards", def: "FIA officials who investigate incidents and decide penalties." },
  },
  {
    slug: "107-rule",
    group: "rules",
    regulated: true,
    explainer: "qualifying",
    es: { term: "Regla del 107 %", def: "Para tomar la salida hay que marcar en Q1 un tiempo no superior al 107 % del más rápido, salvo permiso de los comisarios." },
    en: { term: "107% rule", def: "To start the race, a driver's Q1 time must be within 107% of the fastest, unless the stewards allow otherwise." },
  },
  // ---- Timing y datos ---------------------------------------------------------------------------
  {
    slug: "delta",
    group: "timing",
    explainer: "delta",
    see: ["telemetry", "sector"],
    es: { term: "Delta", def: "Diferencia de tiempo acumulada entre dos vueltas a lo largo del circuito." },
    en: { term: "Delta", def: "The accumulated time difference between two laps along the track." },
  },
  {
    slug: "sector",
    group: "timing",
    see: ["mini-sector"],
    es: { term: "Sector", def: "Cada uno de los tres tramos en que se divide la vuelta para cronometrarla." },
    en: { term: "Sector", def: "One of the three parts into which a lap is split for timing." },
  },
  {
    slug: "mini-sector",
    group: "timing",
    see: ["sector"],
    es: { term: "Minisector", def: "Tramo más corto que un sector, útil para ver dónde se gana o pierde tiempo." },
    en: { term: "Mini-sector", def: "A stretch shorter than a sector, useful to see where time is won or lost." },
  },
  {
    slug: "fastest-lap",
    group: "timing",
    explainer: "points",
    es: { term: "Vuelta rápida", def: "La vuelta más rápida de la carrera. Dio un punto extra de 2019 a 2024." },
    en: { term: "Fastest lap", def: "The quickest lap of the race. It earned a bonus point from 2019 to 2024." },
  },
  {
    slug: "telemetry",
    group: "timing",
    explainer: "telemetry",
    see: ["delta", "speed-trap"],
    es: { term: "Telemetría", def: "Datos que el coche registra durante la vuelta: velocidad, acelerador, freno y marcha, entre otros." },
    en: { term: "Telemetry", def: "Data the car records along the lap: speed, throttle, brake and gear, among others." },
  },
  {
    slug: "speed-trap",
    group: "timing",
    es: { term: "Trampa de velocidad", def: "Punto del circuito donde se mide la velocidad de todos los coches." },
    en: { term: "Speed trap", def: "The point on track where every car's speed is measured." },
  },
  {
    slug: "interval",
    group: "timing",
    see: ["gap-to-leader"],
    es: { term: "Intervalo", def: "Diferencia de tiempo con el coche inmediatamente delante." },
    en: { term: "Interval", def: "The time gap to the car directly ahead." },
  },
  {
    slug: "gap-to-leader",
    group: "timing",
    see: ["interval"],
    es: { term: "Diferencia con el líder", def: "Tiempo que separa a un piloto del primero de la carrera." },
    en: { term: "Gap to leader", def: "The time between a driver and the race leader." },
  },
  {
    slug: "race-pace",
    group: "timing",
    explainer: "tyre-degradation",
    es: { term: "Ritmo de carrera", def: "Tiempo por vuelta sostenido con depósito y neumáticos de carrera, sin contar las vueltas anómalas." },
    en: { term: "Race pace", def: "Sustained lap time on race fuel and tyres, excluding unusual laps." },
  },
  {
    slug: "out-lap",
    group: "timing",
    see: ["pit-stop", "undercut"],
    es: { term: "Vuelta de salida y de entrada", def: "La vuelta en que se sale de boxes y la vuelta en que se entra. Son más lentas y no reflejan el ritmo." },
    en: { term: "Out-lap and in-lap", def: "The lap leaving the pits and the lap entering them. Both are slower and don't reflect pace." },
  },
  // ---- Paddock y fin de semana ------------------------------------------------------------------
  {
    slug: "paddock",
    group: "paddock",
    es: { term: "Paddock", def: "Zona de trabajo de los equipos detrás de los garajes." },
    en: { term: "Paddock", def: "The teams' working area behind the garages." },
  },
  {
    slug: "pit-wall",
    group: "paddock",
    es: { term: "Muro de boxes", def: "Puesto junto a la pista desde el que los ingenieros siguen la carrera y deciden la estrategia." },
    en: { term: "Pit wall", def: "The stand beside the track from which engineers follow the race and call strategy." },
  },
  {
    slug: "starting-grid",
    group: "paddock",
    explainer: "qualifying",
    see: ["pole-position", "grid-penalty"],
    es: { term: "Parrilla de salida", def: "Orden de salida de la carrera, que sale de la clasificación y de las sanciones." },
    en: { term: "Starting grid", def: "The race starting order, set by qualifying and penalties." },
  },
  {
    slug: "pole-position",
    group: "paddock",
    explainer: "qualifying",
    es: { term: "Pole position", def: "Primera posición de la parrilla de salida." },
    en: { term: "Pole position", def: "First place on the starting grid." },
  },
  {
    slug: "pit-lane-start",
    group: "paddock",
    es: { term: "Salida desde boxes", def: "Tomar la salida desde el pit lane, por ejemplo tras cambiar la puesta a punto en parque cerrado." },
    en: { term: "Pit lane start", def: "Starting the race from the pit lane, for example after changing the set-up under parc fermé." },
  },
  {
    slug: "driver-of-the-day",
    group: "paddock",
    es: { term: "Piloto del día", def: "Reconocimiento votado por la afición al final de cada carrera. No da puntos." },
    en: { term: "Driver of the day", def: "A fan-voted award after each race. It gives no points." },
  },
  {
    slug: "lift-and-coast",
    group: "paddock",
    es: { term: "Lift and coast", def: "Levantar el pie antes de la frenada para ahorrar combustible, energía o frenos." },
    en: { term: "Lift and coast", def: "Lifting off before the braking zone to save fuel, energy or brakes." },
  },
  {
    slug: "sandbagging",
    group: "paddock",
    es: { term: "Sandbagging", def: "Esconder el rendimiento real en entrenamientos para no mostrar el potencial." },
    en: { term: "Sandbagging", def: "Hiding true performance in practice so as not to reveal potential." },
  },
  {
    slug: "dirty-side",
    group: "paddock",
    es: { term: "Lado sucio de la parrilla", def: "Lado de la parrilla fuera de la trazada, con menos goma y menos agarre en la salida." },
    en: { term: "Dirty side of the grid", def: "The side of the grid off the racing line, with less rubber and less grip at the start." },
  },
];

export function glossaryBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((g) => g.slug === slug);
}
