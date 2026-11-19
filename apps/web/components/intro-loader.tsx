/**
 * Entrada de la web: pantalla negra, el símbolo se dibuja de un trazo, cae el punto lima, una línea de carga
 * se completa y la pantalla sube como una cortina. Dura 1,4 s, una vez por sesión. Todo es CSS: sin
 * JavaScript también termina sola; el script del layout solo la salta si ya se vio en esta sesión. Con
 * «reducir movimiento» no aparece. Decorativa: no recibe foco ni lectores de pantalla.
 */
const LOGO_PATH = "M6 41V17A7 7 0 0 1 20 17V33M20 23A7 7 0 0 1 6 23M20 17A7 7 0 0 1 34 17V33";

/** Marca la sesión: si ya se vio, <html data-intro="seen"> y la entrada no se pinta. Sin <, > ni &. */
export const INTRO_SCRIPT =
  'try{if(sessionStorage.getItem("pn-intro")){document.documentElement.dataset.intro="seen"}else{sessionStorage.setItem("pn-intro","1")}}catch(e){document.documentElement.dataset.intro="seen"}';

export function IntroLoader() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-mark">
        <svg viewBox="0 4.5 48 39" focusable="false">
          <g transform="translate(7.2 0) skewX(-12)">
            <path d={LOGO_PATH} pathLength={1} className="intro-stroke" />
            <rect x="39" y="27" width="6" height="6" className="intro-dot" />
          </g>
        </svg>
        <span className="intro-bar" />
      </div>
    </div>
  );
}
