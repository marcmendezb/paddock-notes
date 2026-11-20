/**
 * The site's entrance: a black screen, the mark draws itself in one stroke, the lime dot drops, a loading
 * line completes and the screen rises like a curtain. It lasts 1.4 s, once per session. It is all CSS:
 * without JavaScript it also finishes on its own; the layout script only skips it if it was already seen
 * this session. With "reduce motion" it does not appear. Decorative: it takes no focus and is hidden from screen readers.
 */
const LOGO_PATH = "M6 41V17A7 7 0 0 1 20 17V33M20 23A7 7 0 0 1 6 23M20 17A7 7 0 0 1 34 17V33";

/** Marks the session: if already seen, <html data-intro="seen"> and the entrance is not painted. No <, > or &. */
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
