import type { SessionKind } from "@paddock/shared";

/**
 * Pictogramas propios con el ADN del símbolo (marca.md §2): retícula de 24, un solo trazo de 1,75 con
 * remates rectos y, en la mayoría, un cuadrado macizo como «punto» (el eje del cronómetro, el del
 * cuentarrevoluciones, el centro del pin, la fecha del calendario…). Sin librerías ni fuentes de iconos.
 * Siempre decorativos: el texto de al lado dice lo mismo. Los libres («wrench») se dibujan como un neumático.
 *
 * Cada uno tiene una pieza que se mueve (clase «i-anim» y una propia que fija el giro y la animación en
 * globals.css): la aguja del cronómetro da la vuelta, la bandera ondea, el cuentarrevoluciones sube… Se
 * mueve al pasar por encima del enlace o botón que lo contiene y, dentro de un «icon-scroll», al entrar en
 * pantalla. Con «reducir movimiento», quietos.
 */
export type IconName =
  | "search"
  | "user"
  | "flag"
  | "pin"
  | "clock"
  | "stopwatch"
  | "wrench"
  | "bolt"
  | "layers"
  | "book"
  | "eye"
  | "gauge"
  | "calendar"
  | "trophy"
  | "chart"
  | "sun"
  | "moon";

export function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case "search":
      return (
        <g className="i-anim i-tilt">
          <circle cx="10" cy="10" r="6" />
          <path d="M14.5 14.5 18.5 18.5" />
          <rect x="18" y="18" width="3" height="3" className="icon-fill" />
        </g>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="8" r="3.5" className="i-anim i-nod" />
          <path d="M5 20.5V19a5.5 5.5 0 0 1 5.5-5.5h3A5.5 5.5 0 0 1 19 19v1.5" />
        </>
      );
    case "flag":
      // Bandera a cuadros de 4 × 3 casillas, que ondea desde el mástil.
      return (
        <>
          <path d="M5 21.5V3" />
          <g className="i-anim i-wave">
            <path d="M5 4h14v9H5" />
            <rect x="5" y="4" width="3.5" height="3" className="icon-fill" />
            <rect x="12" y="4" width="3.5" height="3" className="icon-fill" />
            <rect x="8.5" y="7" width="3.5" height="3" className="icon-fill" />
            <rect x="15.5" y="7" width="3.5" height="3" className="icon-fill" />
            <rect x="5" y="10" width="3.5" height="3" className="icon-fill" />
            <rect x="12" y="10" width="3.5" height="3" className="icon-fill" />
          </g>
        </>
      );
    case "pin":
      return (
        <g className="i-anim i-drop">
          <path d="M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
          <rect x="10.25" y="8.75" width="3.5" height="3.5" className="icon-fill" />
        </g>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" className="i-anim i-hands" />
          <path d="M12 3.5v1.5M20.5 12H19M12 20.5V19M3.5 12H5" />
        </>
      );
    case "stopwatch":
      // Cronómetro con corona y botón lateral; la aguja da la vuelta y el eje es el cuadrado de la marca.
      return (
        <>
          <circle cx="12" cy="13.5" r="7" />
          <path d="M10 2.75h4M12 2.75V6.5M18 7.5l1.5-1.5" />
          <path d="M12 13.5V9.25" className="i-anim i-sweep" />
          <rect x="10.75" y="12.25" width="2.5" height="2.5" className="icon-fill" />
        </>
      );
    case "wrench":
      // Libres: un neumático (banda, llanta y dibujo) que rueda.
      return (
        <g className="i-anim i-roll">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.75 1.75M16.25 16.25 18 18M18 6l-1.75 1.75M7.75 16.25 6 18" />
        </g>
      );
    case "bolt":
      return <path d="M13.5 2.5 6 13h5.5l-1 8.5L18 11h-5.5l1-8.5Z" className="i-anim i-flash" />;
    case "layers":
      return (
        <>
          <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" className="i-anim i-stack" />
          <path d="M3.5 12 12 16.5 20.5 12" />
          <path d="M3.5 16 12 20.5 20.5 16" />
        </>
      );
    case "book":
      return (
        <>
          <path d="M3.5 5.5c3-1 5.5-.5 8.5 1.5v13c-3-2-5.5-2.5-8.5-1.5V5.5Z" className="i-anim i-page" />
          <path d="M20.5 5.5c-3-1-5.5-.5-8.5 1.5v13c3-2 5.5-2.5 8.5-1.5V5.5Z" />
        </>
      );
    case "eye":
      return (
        <g className="i-anim i-blink">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <rect x="10" y="10" width="4" height="4" className="icon-fill" />
        </g>
      );
    case "gauge":
      // Cuentarrevoluciones con marcas; la aguja sube y el eje es el cuadrado de la marca.
      return (
        <>
          <path d="M4 17.5a8.5 8.5 0 1 1 16 0" />
          <path d="M6.4 10.4 7.6 11.3M12 5.5V7M17.6 10.4 16.4 11.3" />
          <path d="M12 15.5 16 11" className="i-anim i-needle" />
          <rect x="10.75" y="14.25" width="2.5" height="2.5" className="icon-fill" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
          <rect x="7" y="12.5" width="3.5" height="3.5" className="icon-fill i-anim i-pop" />
        </>
      );
    case "trophy":
      return (
        <>
          <path d="M7 4h10v4.5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4.5v1A3.5 3.5 0 0 0 8 10.5M17 6h2.5v1A3.5 3.5 0 0 1 16 10.5" />
          <path d="M12 13.5v4M8 20.5h8" />
          <rect x="10.75" y="5.75" width="2.5" height="2.5" className="icon-fill i-anim i-spark" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M3.5 3.5v17h17" />
          <path d="M7 15.5l3.5-4.5 3 2.5 4.5-6" pathLength={1} className="i-anim i-draw" />
          <rect x="17" y="5.5" width="3" height="3" className="icon-fill i-anim i-pop-end" />
        </>
      );
    case "sun":
      // El sol es el cuadrado de la marca; los rayos giran despacio.
      return (
        <>
          <rect x="8.5" y="8.5" width="7" height="7" className="icon-fill" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" className="i-anim i-spin" />
        </>
      );
    case "moon":
      return (
        <>
          <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
          <rect x="16" y="4" width="3" height="3" className="icon-fill i-anim i-pop-end" />
        </>
      );
  }
}

/** Pictograma en línea con el texto (1em, color del texto). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : "icon"} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <IconPaths name={name} />
    </svg>
  );
}

/** El pictograma de cada tipo de sesión. */
export const SESSION_ICON: Record<SessionKind, IconName> = {
  fp1: "wrench",
  fp2: "wrench",
  fp3: "wrench",
  sprint_qualifying: "stopwatch",
  sprint: "bolt",
  qualifying: "stopwatch",
  race: "flag",
};
