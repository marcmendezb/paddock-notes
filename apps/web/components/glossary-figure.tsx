import type { ReactNode } from "react";

/**
 * Ejemplo gráfico de cada término del glosario (CON-02). Un lenguaje común de pocas piezas —línea de
 * vueltas con stints, curva de tiempos, trazado, silueta del coche, neumático, parrilla y barras— que cada
 * término combina a su manera. Lima y lila sobre negro; los rótulos, neutros respecto al idioma (P1, V12,
 * +5 s, S/M/H). Decorativo: la definición y el ejemplo van en el texto de la página. SVG estático (D-04).
 */

const W = 400;
const H = 200;
type Fig = () => ReactNode;

// ---- Piezas ------------------------------------------------------------------------------------------

const T = ({ x, y, children, anchor = "middle", cls = "gf-t" }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; cls?: string }) => (
  <text x={x} y={y} textAnchor={anchor} className={cls}>
    {children}
  </text>
);

/** Eje de vueltas (de 1 a `laps`) a la altura `y`. */
const LapAxis = ({ y = 170, laps = 50 }: { y?: number; laps?: number }) => (
  <g>
    <line x1={30} x2={370} y1={y} y2={y} className="gf-axis" />
    {[1, Math.round(laps / 2), laps].map((l) => (
      <T key={l} x={30 + ((l - 1) / (laps - 1)) * 340} y={y + 18} cls="gf-m">
        {`V${l}`}
      </T>
    ))}
  </g>
);
const lapX = (l: number, laps = 50) => 30 + ((l - 1) / (laps - 1)) * 340;

/** Fila de stints: compuestos (S, M, H, I, W) entre las vueltas de parada. */
function Stints({ y, stops, comps, label, laps = 50, hl }: { y: number; stops: number[]; comps: string[]; label?: string; laps?: number; hl?: number }) {
  const edges = [1, ...stops, laps];
  return (
    <g>
      {label ? (
        <T x={22} y={y + 5} anchor="end" cls="gf-m">
          {label}
        </T>
      ) : null}
      {comps.map((c, i) => {
        const x1 = lapX(edges[i]!, laps);
        const x2 = lapX(edges[i + 1]!, laps);
        return (
          <g key={i}>
            <rect x={x1 + 1} y={y - 8} width={Math.max(2, x2 - x1 - 2)} height={16} className={`gf-stint gf-c-${c}${hl === i ? " is-hl" : ""}`} />
            <T x={(x1 + x2) / 2} y={y + 4} cls="gf-stint-t">
              {c}
            </T>
          </g>
        );
      })}
      {stops.map((s) => (
        <rect key={s} x={lapX(s, laps) - 3} y={y - 13} width={6} height={26} className="gf-pit" />
      ))}
    </g>
  );
}

/** Curva por vueltas: `pts` son valores 0–1 (arriba = más lento). */
function Curve({ pts, cls = "gf-a", y0 = 30, y1 = 150 }: { pts: number[]; cls?: string; y0?: number; y1?: number }) {
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(30 + (i / (pts.length - 1)) * 340).toFixed(1)},${(y0 + v * (y1 - y0)).toFixed(1)}`).join("");
  return <path d={d} className={`gf-curve ${cls}`} />;
}

/** Trazado esquemático (un óvalo con chicane) y su recorrido. */
const TRACK = "M70,150 C40,150 30,120 40,95 C55,55 95,40 150,45 L250,45 C300,45 340,60 355,90 C368,118 350,150 310,150 L230,150 C215,150 210,135 195,135 C180,135 175,150 160,150 Z";
const Track = ({ cls = "gf-track" }: { cls?: string }) => <path d={TRACK} className={cls} />;

/** Coche de perfil, mirando a la derecha, con su caja en (x, y). */
const Car = ({ x = 120, y = 110, s = 1, cls = "gf-car" }: { x?: number; y?: number; s?: number; cls?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={cls}>
    <path d="M0,0 L18,-4 L40,-6 L60,-14 L85,-14 L95,-6 L150,-4 L160,0 L160,6 L0,6 Z" className="gf-car-body" />
    <rect x={-6} y={-24} width={18} height={5} className="gf-car-wing" />
    <rect x={2} y={-20} width={3} height={16} className="gf-car-wing" />
    <rect x={150} y={-2} width={18} height={3} className="gf-car-wing" />
    <circle cx={25} cy={8} r={11} className="gf-wheel" />
    <circle cx={128} cy={8} r={11} className="gf-wheel" />
  </g>
);

/** Coche visto desde arriba, pequeño, para trazados y parrillas. */
const Dot = ({ x, y, cls = "gf-dot", label }: { x: number; y: number; cls?: string; label?: string }) => (
  <g>
    <rect x={x - 9} y={y - 5} width={18} height={10} className={cls} />
    {label ? (
      <T x={x} y={y - 9} cls="gf-m">
        {label}
      </T>
    ) : null}
  </g>
);

/** Flecha de (x1, y1) a (x2, y2). */
const Arrow = ({ x1, y1, x2, y2, cls = "gf-arrow" }: { x1: number; y1: number; x2: number; y2: number; cls?: string }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 7;
  const p1 = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)];
  const p2 = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={`M${p1[0]!.toFixed(1)},${p1[1]!.toFixed(1)} L${x2},${y2} L${p2[0]!.toFixed(1)},${p2[1]!.toFixed(1)}`} />
    </g>
  );
};

/** Neumático visto de lado con su banda de color y letra. */
const Tyre = ({ x, y, r = 34, c, cls }: { x: number; y: number; r?: number; c: string; cls?: string }) => (
  <g className={cls}>
    <circle cx={x} cy={y} r={r} className="gf-tyre" />
    <circle cx={x} cy={y} r={r * 0.72} className={`gf-tyre-band gf-c-${c}`} />
    <circle cx={x} cy={y} r={r * 0.5} className="gf-rim" />
    <T x={x} y={y + 5} cls="gf-tyre-t">
      {c}
    </T>
  </g>
);

/** Barras horizontales con valor (de 0 a 1) y rótulo. */
const Bars = ({ rows, y = 40, gap = 30 }: { rows: { label: string; v: number; cls?: string; text?: string }[]; y?: number; gap?: number }) => (
  <g>
    {rows.map((r, i) => (
      <g key={i}>
        <T x={60} y={y + i * gap + 5} anchor="end" cls="gf-m">
          {r.label}
        </T>
        <rect x={70} y={y + i * gap - 8} width={290} height={16} className="gf-rail" />
        <rect x={70} y={y + i * gap - 8} width={290 * r.v} height={16} className={r.cls ?? "gf-bar"} />
        {r.text ? (
          <T x={70 + 290 * r.v + 6} y={y + i * gap + 5} anchor="start" cls="gf-t">
            {r.text}
          </T>
        ) : null}
      </g>
    ))}
  </g>
);

/** Parrilla escalonada de `n` coches; `hl` marca posiciones. */
const Grid = ({ n = 10, hl = {} as Record<number, string>, x0 = 70 }: { n?: number; hl?: Record<number, string>; x0?: number }) => (
  <g>
    <line x1={x0 - 30} x2={370} y1={100} y2={100} className="gf-axis gf-dash" />
    {Array.from({ length: n }, (_, i) => {
      const p = i + 1;
      const x = x0 + Math.floor(i / 2) * 62 + (i % 2) * 28;
      const y = i % 2 ? 128 : 72;
      return <Dot key={p} x={x} y={y} cls={hl[p] ?? "gf-dot"} label={`P${p}`} />;
    })}
  </g>
);

// ---- Figuras por término -----------------------------------------------------------------------------

const wave = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));

const FIGURES: Record<string, Fig> = {
  // Carrera y estrategia
  undercut: () => (
    <>
      <Stints y={70} stops={[18]} comps={["M", "H"]} label="A" hl={1} />
      <Stints y={115} stops={[21]} comps={["M", "H"]} label="B" />
      <Arrow x1={lapX(18)} y1={140} x2={lapX(21)} y2={140} cls="gf-arrow gf-a" />
      <T x={(lapX(18) + lapX(21)) / 2} y={156} cls="gf-a-t">
        -1.4 s
      </T>
      <LapAxis />
    </>
  ),
  overcut: () => (
    <>
      <Stints y={70} stops={[18]} comps={["M", "H"]} label="A" />
      <Stints y={115} stops={[24]} comps={["M", "H"]} label="B" hl={0} />
      <Arrow x1={lapX(18)} y1={140} x2={lapX(24)} y2={140} cls="gf-arrow gf-b" />
      <LapAxis />
    </>
  ),
  stint: () => (
    <>
      <Stints y={90} stops={[16, 35]} comps={["S", "M", "H"]} hl={1} />
      <T x={(lapX(16) + lapX(35)) / 2} y={60} cls="gf-a-t">
        STINT 2
      </T>
      <LapAxis />
    </>
  ),
  "pit-stop": () => (
    <>
      <Stints y={60} stops={[24]} comps={["M", "H"]} />
      <rect x={110} y={100} width={180} height={34} className="gf-lane" />
      <Dot x={200} y={117} cls="gf-dot gf-a-f" />
      <T x={200} y={156} cls="gf-a-t">
        2.4 s
      </T>
      <T x={300} y={122} anchor="start" cls="gf-m">
        PIT
      </T>
    </>
  ),
  "pit-window": () => (
    <>
      <rect x={lapX(15)} y={40} width={lapX(24) - lapX(15)} height={110} className="gf-window" />
      <Stints y={95} stops={[19]} comps={["M", "H"]} />
      <T x={(lapX(15) + lapX(24)) / 2} y={60} cls="gf-b-t">
        V15–V24
      </T>
      <LapAxis />
    </>
  ),
  "double-stack": () => (
    <>
      <rect x={70} y={85} width={260} height={40} className="gf-lane" />
      <Dot x={170} y={105} cls="gf-dot gf-a-f" />
      <Dot x={220} y={105} cls="gf-dot gf-b-f" />
      <T x={170} y={150} cls="gf-a-t">
        2.3 s
      </T>
      <T x={220} y={150} cls="gf-b-t">
        +4.1 s
      </T>
    </>
  ),
  "team-orders": () => (
    <>
      <Track />
      <Dot x={250} y={45} cls="gf-dot gf-b-f" label="P2" />
      <Dot x={200} y={45} cls="gf-dot gf-a-f" label="P3" />
      <path d="M200,65 C215,80 240,80 250,65" className="gf-swap" />
    </>
  ),
  "safety-car": () => (
    <>
      <Track />
      <Dot x={250} y={45} cls="gf-dot gf-sc" label="SC" />
      {[225, 205, 185, 165, 145].map((x, i) => (
        <Dot key={x} x={x} y={45} cls={i === 0 ? "gf-dot gf-a-f" : "gf-dot"} />
      ))}
    </>
  ),
  "virtual-safety-car": () => (
    <>
      <Track />
      {[[250, 45], [120, 46], [340, 100], [60, 120], [250, 150]].map(([x, y], i) => (
        <Dot key={i} x={x!} y={y!} cls="gf-dot" />
      ))}
      <T x={200} y={105} cls="gf-b-t">
        VSC · Δ ≥ 0
      </T>
    </>
  ),
  "red-flag": () => (
    <>
      <line x1={150} x2={150} y1={40} y2={165} className="gf-pole" />
      <path d="M150,42 L260,52 L250,85 L150,90 Z" className="gf-flag" />
      <rect x={200} y={120} width={160} height={30} className="gf-lane" />
      {[220, 250, 280, 310, 340].map((x) => (
        <Dot key={x} x={x} y={135} cls="gf-dot" />
      ))}
    </>
  ),
  "formation-lap": () => (
    <>
      <Track />
      {[[210, 45], [180, 45], [150, 46], [120, 50]].map(([x, y], i) => (
        <Dot key={i} x={x!} y={y!} cls={i === 0 ? "gf-dot gf-a-f" : "gf-dot"} />
      ))}
      <path d="M230,30 C260,25 280,30 300,40" className="gf-swap" />
    </>
  ),

  // Neumáticos
  compound: () => (
    <>
      <Tyre x={95} y={100} c="S" />
      <Tyre x={200} y={100} c="M" />
      <Tyre x={305} y={100} c="H" />
      <Arrow x1={95} y1={165} x2={305} y2={165} cls="gf-arrow gf-m-s" />
    </>
  ),
  "dry-tyres": () => (
    <>
      <Tyre x={95} y={100} c="S" />
      <Tyre x={200} y={100} c="M" />
      <Tyre x={305} y={100} c="H" />
    </>
  ),
  "intermediate-tyre": () => (
    <>
      <Tyre x={140} y={100} c="I" r={50} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${230 + i * 22},70 q8,30 0,60`} className="gf-rain" />
      ))}
    </>
  ),
  "full-wet-tyre": () => (
    <>
      <Tyre x={140} y={100} c="W" r={50} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${220 + i * 18},55 q8,45 0,90`} className="gf-rain is-heavy" />
      ))}
    </>
  ),
  degradation: () => (
    <>
      <Curve pts={wave(20, (t) => 0.75 - t * 0.6)} />
      <LapAxis laps={20} />
    </>
  ),
  graining: () => (
    <>
      <Curve pts={wave(24, (t) => 0.75 - 0.35 * Math.exp(-((t - 0.35) ** 2) / 0.012) - t * 0.15)} />
      <T x={150} y={60} cls="gf-a-t">
        GRAINING
      </T>
      <LapAxis laps={24} />
    </>
  ),
  blistering: () => (
    <>
      <Tyre x={110} y={95} c="M" r={48} />
      {[[95, 70], [128, 82], [100, 118], [132, 110]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} className="gf-blister" />
      ))}
      <Curve pts={wave(12, (t) => 0.7 - t * t * 0.55)} y0={40} y1={150} cls="gf-b" />
    </>
  ),
  "operating-window": () => (
    <>
      <rect x={150} y={40} width={110} height={110} className="gf-window" />
      <Curve pts={wave(30, (t) => 0.2 + 0.7 * ((t - 0.5) * 1.8) ** 2)} />
      <T x={205} y={60} cls="gf-b-t">
        100–110 °C
      </T>
      <line x1={30} x2={370} y1={170} y2={170} className="gf-axis" />
    </>
  ),
  "tyre-cliff": () => (
    <>
      <Curve pts={wave(26, (t) => (t < 0.75 ? 0.72 - t * 0.12 : 0.63 - (t - 0.75) * 2.3))} />
      <circle cx={30 + 0.75 * 340} cy={30 + 0.63 * 120} r={6} className="gf-mark-b" />
      <LapAxis laps={26} />
    </>
  ),
  "two-compound-rule": () => (
    <>
      <Stints y={70} stops={[22]} comps={["M", "H"]} label="✓" />
      <Stints y={115} stops={[]} comps={["M"]} label="✗" />
      <LapAxis />
    </>
  ),

  // Aerodinámica y coche
  downforce: () => (
    <>
      <Car />
      {[140, 190, 240].map((x) => (
        <Arrow key={x} x1={x} y1={35} x2={x} y2={75} cls="gf-arrow gf-a" />
      ))}
    </>
  ),
  drag: () => (
    <>
      <Car />
      {[70, 95, 120].map((y) => (
        <Arrow key={y} x1={360} y1={y} x2={300} y2={y} cls="gf-arrow gf-b" />
      ))}
    </>
  ),
  "dirty-air": () => (
    <>
      <Car x={210} y={110} s={0.8} />
      <Car x={30} y={110} s={0.8} cls="gf-car is-b" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${200},${85 + i * 12} q-20,-8 -35,0 t-35,0`} className="gf-turb" />
      ))}
    </>
  ),
  slipstream: () => (
    <>
      <Car x={220} y={110} s={0.75} />
      <Car x={40} y={110} s={0.75} cls="gf-car is-b" />
      <path d="M215,95 L170,88 L170,118 L215,112 Z" className="gf-wake" />
      <Arrow x1={170} y1={150} x2={220} y2={150} cls="gf-arrow gf-b" />
    </>
  ),
  "ground-effect": () => (
    <>
      <Car />
      <path d="M100,135 C150,128 220,128 300,135" className="gf-flow" />
      <path d="M100,142 C160,138 220,138 300,142" className="gf-flow" />
      <Arrow x1={200} y1={70} x2={200} y2={95} cls="gf-arrow gf-a" />
    </>
  ),
  porpoising: () => (
    <>
      <Car y={95} />
      <Curve pts={wave(40, (t) => 0.5 + 0.35 * Math.sin(t * Math.PI * 8))} y0={130} y1={175} cls="gf-b" />
    </>
  ),
  "front-wing": () => (
    <>
      <Car />
      <circle cx={293} cy={109} r={22} className="gf-focus" />
    </>
  ),
  "rear-wing": () => (
    <>
      <Car />
      <circle cx={121} cy={89} r={22} className="gf-focus" />
    </>
  ),
  diffuser: () => (
    <>
      <Car />
      <circle cx={128} cy={118} r={20} className="gf-focus" />
      <path d="M150,128 C130,132 110,140 90,150" className="gf-flow" />
    </>
  ),
  "overtake-mode": () => (
    <>
      <Car x={60} y={110} s={0.8} cls="gf-car is-b" />
      <rect x={230} y={60} width={110} height={40} className="gf-rail" />
      <rect x={230} y={60} width={88} height={40} className="gf-bar-a" />
      <T x={285} y={125} cls="gf-a-t">
        +350 kW
      </T>
    </>
  ),

  // Reglamento
  "parc-ferme": () => (
    <>
      <Car x={110} y={120} />
      <rect x={90} y={50} width={220} height={95} className="gf-box" />
      <T x={200} y={42} cls="gf-b-t">
        PARC FERMÉ
      </T>
    </>
  ),
  "track-limits": () => (
    <>
      <path d="M40,160 C120,160 160,60 360,50" className="gf-kerb" />
      <path d="M40,130 C110,130 150,40 360,25" className="gf-limit" />
      <Dot x={250} y={38} cls="gf-dot gf-b-f" />
    </>
  ),
  "time-penalty": () => (
    <Bars
      rows={[
        { label: "A", v: 0.78, text: "1:35:21" },
        { label: "A", v: 0.86, cls: "gf-bar-b", text: "+5 s" },
      ]}
      y={80}
      gap={44}
    />
  ),
  "drive-through": () => (
    <>
      <rect x={60} y={85} width={280} height={40} className="gf-lane" />
      <Arrow x1={70} y1={105} x2={330} y2={105} cls="gf-arrow gf-b" />
      <T x={200} y={150} cls="gf-b-t">
        80 km/h
      </T>
    </>
  ),
  "stop-and-go": () => (
    <>
      <rect x={60} y={85} width={280} height={40} className="gf-lane" />
      <Dot x={200} y={105} cls="gf-dot gf-b-f" />
      <T x={200} y={150} cls="gf-b-t">
        10 s
      </T>
    </>
  ),
  "grid-penalty": () => <Grid hl={{ 3: "gf-dot gf-m-f", 8: "gf-dot gf-b-f" }} />,
  "penalty-points": () => (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={40 + i * 27} y={80} width={22} height={40} className={i < 9 ? "gf-bar-b" : "gf-rail"} />
      ))}
      <T x={200} y={150} cls="gf-t">
        9 / 12
      </T>
    </>
  ),
  "cost-cap": () => (
    <>
      <Bars rows={[{ label: "€", v: 0.92 }]} y={95} />
      <line x1={70 + 290 * 0.84} x2={70 + 290 * 0.84} y1={70} y2={125} className="gf-cap" />
      <T x={70 + 290 * 0.84} y={60} cls="gf-b-t">
        CAP
      </T>
    </>
  ),
  stewards: () => (
    <>
      {[130, 200, 270].map((x) => (
        <g key={x}>
          <circle cx={x} cy={80} r={16} className="gf-head" />
          <rect x={x - 22} y={100} width={44} height={40} className="gf-head" />
        </g>
      ))}
      <rect x={100} y={140} width={200} height={10} className="gf-bar-b" />
    </>
  ),
  "107-rule": () => (
    <>
      <Bars
        rows={[
          { label: "P1", v: 0.7, cls: "gf-bar-a" },
          { label: "P10", v: 0.72 },
          { label: "P20", v: 0.79, cls: "gf-bar-b" },
        ]}
      />
      <line x1={70 + 290 * 0.749} x2={70 + 290 * 0.749} y1={25} y2={115} className="gf-cap" />
      <T x={70 + 290 * 0.749} y={135} cls="gf-b-t">
        107 %
      </T>
    </>
  ),

  // Timing y datos
  delta: () => (
    <>
      <line x1={30} x2={370} y1={100} y2={100} className="gf-axis gf-dash" />
      <Curve pts={wave(30, (t) => 0.5 - 0.3 * Math.sin(t * Math.PI * 1.4) + t * 0.1)} y0={40} y1={160} />
      <T x={360} y={92} anchor="end" cls="gf-m">
        0
      </T>
    </>
  ),
  sector: () => (
    <>
      <path d={TRACK} className="gf-track" />
      <path d={TRACK} pathLength={3} className="gf-sector s1" />
      <path d={TRACK} pathLength={3} className="gf-sector s2" />
      <T x={110} y={42} cls="gf-a-t">
        S1
      </T>
      <T x={340} y={130} anchor="end" cls="gf-b-t">
        S2
      </T>
      <T x={120} y={168} cls="gf-t">
        S3
      </T>
    </>
  ),
  "mini-sector": () => (
    <>
      <path d={TRACK} className="gf-track" />
      <path d={TRACK} pathLength={24} className="gf-minis" />
    </>
  ),
  "fastest-lap": () => (
    <>
      {wave(14, (t) => 0.55 + 0.3 * Math.sin(t * 9) * (1 - t)).map((v, i) => (
        <rect key={i} x={40 + i * 23} y={170 - v * 120} width={16} height={v * 120} className={i === 10 ? "gf-bar-a" : "gf-bar"} />
      ))}
    </>
  ),
  telemetry: () => (
    <>
      <Curve pts={wave(60, (t) => 0.5 + 0.4 * Math.sin(t * 13) * Math.cos(t * 3))} />
      <Curve pts={wave(60, (t) => 0.52 + 0.38 * Math.sin(t * 13 + 0.15) * Math.cos(t * 3))} cls="gf-b" />
    </>
  ),
  "speed-trap": () => (
    <>
      <path d={TRACK} className="gf-track" />
      <line x1={300} x2={300} y1={30} y2={60} className="gf-cap" />
      <T x={300} y={24} cls="gf-a-t">
        342 km/h
      </T>
    </>
  ),
  interval: () => (
    <>
      <line x1={30} x2={370} y1={100} y2={100} className="gf-axis" />
      <Dot x={280} y={100} cls="gf-dot gf-a-f" label="P1" />
      <Dot x={200} y={100} cls="gf-dot gf-b-f" label="P2" />
      <Dot x={90} y={100} cls="gf-dot" label="P3" />
      <Arrow x1={200} y1={130} x2={280} y2={130} cls="gf-arrow gf-b" />
      <T x={240} y={150} cls="gf-b-t">
        +1.2
      </T>
      <Arrow x1={90} y1={130} x2={200} y2={130} cls="gf-arrow gf-m-s" />
      <T x={145} y={150} cls="gf-t">
        +2.0
      </T>
    </>
  ),
  "gap-to-leader": () => (
    <>
      <line x1={30} x2={370} y1={100} y2={100} className="gf-axis" />
      <Dot x={300} y={100} cls="gf-dot gf-a-f" label="P1" />
      <Dot x={90} y={100} cls="gf-dot gf-b-f" label="P3" />
      <Arrow x1={90} y1={130} x2={300} y2={130} cls="gf-arrow gf-b" />
      <T x={195} y={150} cls="gf-b-t">
        +3.2
      </T>
    </>
  ),
  "race-pace": () => (
    <>
      <Curve pts={wave(20, (t) => 0.6 - t * 0.2 + 0.05 * Math.sin(t * 20))} />
      <Curve pts={wave(20, (t) => 0.7 - t * 0.15 + 0.05 * Math.cos(t * 18))} cls="gf-b" />
      <LapAxis laps={20} />
    </>
  ),
  "out-lap": () => (
    <>
      <Stints y={70} stops={[20]} comps={["M", "H"]} />
      {wave(10, (t) => (t === 0 ? 0.95 : 0.4 + 0.05 * Math.sin(t * 9))).map((v, i) => (
        <rect key={i} x={150 + i * 21} y={170 - v * 70} width={14} height={v * 70} className={i === 0 ? "gf-bar-b" : "gf-bar"} />
      ))}
    </>
  ),

  // Paddock y fin de semana
  paddock: () => (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={40 + i * 66} y={50} width={56} height={40} className={i === 2 ? "gf-bar-a" : "gf-box"} />
      ))}
      <rect x={40} y={110} width={320} height={22} className="gf-lane" />
      <line x1={40} x2={360} y1={150} y2={150} className="gf-axis" />
    </>
  ),
  "pit-wall": () => (
    <>
      <rect x={40} y={60} width={320} height={30} className="gf-lane" />
      <rect x={40} y={95} width={320} height={10} className="gf-bar-a" />
      <line x1={40} x2={360} y1={130} y2={130} className="gf-axis" />
      <Dot x={250} y={130} cls="gf-dot gf-b-f" />
    </>
  ),
  "starting-grid": () => <Grid />,
  "pole-position": () => <Grid hl={{ 1: "gf-dot gf-a-f" }} />,
  "pit-lane-start": () => (
    <>
      <Grid n={8} />
      <rect x={40} y={160} width={320} height={18} className="gf-lane" />
      <Dot x={60} y={169} cls="gf-dot gf-b-f" label="PL" />
    </>
  ),
  "driver-of-the-day": () => (
    <Bars
      rows={[
        { label: "A", v: 0.42, cls: "gf-bar-a", text: "42 %" },
        { label: "B", v: 0.27, text: "27 %" },
        { label: "C", v: 0.18, text: "18 %" },
      ]}
      y={60}
      gap={40}
    />
  ),
  "lift-and-coast": () => (
    <>
      <Curve pts={wave(40, (t) => (t < 0.55 ? 0.15 : t < 0.7 ? 0.15 + (t - 0.55) * 0.6 : 0.24 + (t - 0.7) * 2.2))} />
      <rect x={30 + 0.55 * 340} y={30} width={0.15 * 340} height={130} className="gf-window" />
    </>
  ),
  sandbagging: () => (
    <>
      <Bars
        rows={[
          { label: "FP", v: 0.55, text: "P9" },
          { label: "Q", v: 0.92, cls: "gf-bar-a", text: "P1" },
        ]}
        y={80}
        gap={44}
      />
    </>
  ),
  "dirty-side": () => (
    <>
      <Grid n={6} hl={{ 2: "gf-dot gf-b-f", 4: "gf-dot gf-b-f", 6: "gf-dot gf-b-f" }} />
      <rect x={40} y={115} width={330} height={28} className="gf-window" />
    </>
  ),
};

export function GlossaryFigure({ slug, label }: { slug: string; label: string }) {
  const fig = FIGURES[slug];
  if (!fig) return null;
  return (
    <svg className="gf" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {fig()}
    </svg>
  );
}
