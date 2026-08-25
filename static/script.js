@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  --ink: #15233b;
  --muted: #66758d;
  --surface: #ffffff;
  --surface-soft: #f6f9fe;
  --line: #dce5f2;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-soft: #eaf2ff;
  --teal: #0f9f9a;
  --green: #14804a;
  --red: #cf3d57;
  --gold: #c78500;
  --shadow: 0 16px 42px rgba(42, 68, 112, .10);
  --font: 'Manrope', sans-serif;
  --mono: 'DM Mono', monospace;
}

* { box-sizing: border-box; }
body { min-height: 100vh; margin: 0; color: var(--ink); font-family: var(--font); background: linear-gradient(135deg, #f4f8ff 0%, #eef7ff 48%, #f9fbff 100%); }
button { border: 0; border-radius: 10px; cursor: pointer; font: 700 14px var(--font); transition: transform .18s, box-shadow .18s, background .18s; }
button:hover { transform: translateY(-1px); }
button:focus-visible { outline: 3px solid rgba(37, 99, 235, .28); outline-offset: 3px; }
.scanlines, .vignette, .background-circle { display: none; }

.app-container { width: min(960px, calc(100% - 32px)); margin: auto; padding: 54px 0 42px; }
.header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.logo { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 17px; color: #fff; font-size: 29px; background: linear-gradient(145deg, #3778f3, #1d4ed8); box-shadow: 0 10px 22px rgba(37, 99, 235, .27); }
.header h1 { margin: 0 0 5px; font-size: clamp(24px, 4vw, 33px); letter-spacing: -.06em; font-weight: 800; }
.header p { margin: 0; color: var(--muted); font-size: 14px; }

.score-console { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 10px; margin-bottom: 18px; }
.score-slot { min-width: 90px; padding: 13px 12px; text-align: center; border: 1px solid var(--line); border-radius: 13px; background: rgba(255,255,255,.75); }
.score-label { color: var(--muted); font: 11px var(--mono); letter-spacing: .07em; text-transform: uppercase; }
.score-value { margin-top: 4px; font-size: 22px; font-weight: 800; }
.wins .score-value { color: var(--green); }.losses .score-value { color: var(--red); }.ties .score-value { color: var(--gold); }
.score-reset { padding: 0 18px; color: var(--muted); border: 1px solid var(--line); background: #fff; }.score-reset:hover { color: var(--primary); border-color: #a8c5fa; }

.main-card { padding: 26px; border: 1px solid rgba(220,229,242,.95); border-radius: 22px; background: rgba(255,255,255,.92); box-shadow: var(--shadow); }
.selector-row { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 22px; justify-items: center; }
.selector-row .selector-group { width: min(320px, 100%); }
.selector-group { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-soft); }
.selector-btn { flex: 1; min-height: 42px; color: var(--muted); background: transparent; }.selector-btn.active { color: var(--primary-dark); background: #fff; box-shadow: 0 2px 7px rgba(28,55,93,.10); }

.primary-button { padding: 12px 19px; color: #fff; background: var(--primary); box-shadow: 0 7px 15px rgba(37,99,235,.20); }.primary-button:hover { background: var(--primary-dark); box-shadow: 0 9px 19px rgba(37,99,235,.26); }
.secondary-button { padding: 11px 17px; color: var(--ink); border: 1px solid var(--line); background: #fff; }.secondary-button:hover { border-color: #b5c9ec; background: var(--surface-soft); }

.live-heading { display: flex; justify-content: space-between; gap: 12px; max-width: 490px; margin: 0 auto 11px; color: var(--muted); font: 12px var(--mono); }.live-heading strong { color: var(--ink); }.live-dot { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 50%; background: var(--red); }.webcam-panel.live .live-dot { background: var(--teal); box-shadow: 0 0 0 4px rgba(15,159,154,.13); }
.viewfinder { position: relative; width: min(100%, 490px); aspect-ratio: 1; margin: auto; overflow: hidden; border: 1px solid #bfcee4; border-radius: 18px; background: #eaf0f8; }.viewfinder video, .viewfinder canvas { display: block; width: 100%; height: 100%; object-fit: cover; }.webcam-panel.live video { transform: scaleX(-1); }
.viewfinder-idle { position: absolute; inset: 0; display: grid; place-content: center; gap: 10px; color: var(--muted); text-align: center; font-size: 13px; }.viewfinder-idle span:first-child { font-size: 38px; }
.corner { position: absolute; z-index: 2; width: 26px; height: 26px; border: 3px solid #fff; opacity: .88; }.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }.br { right: 12px; bottom: 12px; border-top: 0; border-left: 0; }
.scan-line { position: absolute; z-index: 2; right: 0; left: 0; height: 2px; opacity: 0; background: rgba(255,255,255,.9); box-shadow: 0 0 10px #fff; }.webcam-panel.live .scan-line { opacity: 1; animation: scan 2.2s linear infinite; }@keyframes scan { 0%,100% { top: 8%; }50% { top: 92%; } }
.webcam-controls { display: flex; justify-content: center; gap: 9px; margin-top: 17px; flex-wrap: wrap; }

.vs-panel { margin-top: 24px; padding: 20px; border: 1px solid var(--line); border-radius: 15px; background: #fff; }.vs-panel h3 { margin: 0 0 16px; color: var(--muted); font: 12px var(--mono); text-transform: uppercase; }.vs-row { display: flex; align-items: center; justify-content: center; gap: 20px; }.vs-side { flex: 1; }.vs-emoji { display: block; font-size: 42px; }.vs-tag { color: var(--muted); font-size: 12px; }.vs-name { font-weight: 800; }.vs-versus { color: var(--primary); font-weight: 800; }.vs-outcome { margin-top: 14px; font-weight: 800; }.vs-outcome.win { color: var(--green); }.vs-outcome.lose { color: var(--red); }.vs-outcome.tie { color: var(--gold); }
.error { display: flex; gap: 10px; align-items: center; margin-top: 18px; padding: 13px 15px; color: #9b2439; border: 1px solid #f5c7d0; border-radius: 12px; background: #fff2f4; font-size: 14px; }.error p { margin: 0; }
footer { margin-top: 25px; color: var(--muted); text-align: center; font-size: 12px; }.hidden { display: none !important; }
@media (max-width: 650px) { .app-container { width: min(100% - 22px, 960px); padding-top: 25px; }.main-card { padding: 16px; border-radius: 17px; }.score-console { grid-template-columns: repeat(3,1fr); }.score-reset { min-height: 38px; grid-column: 1/-1; }.selector-row { grid-template-columns: 1fr; gap: 8px; }.live-heading { flex-direction: column; }.header h1 { letter-spacing: -.05em; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; } }

.vs-outcome.player-one { color: var(--green); }
.vs-outcome.player-two { color: var(--red); }

.celebration { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 22px; background: rgba(21, 35, 59, .28); backdrop-filter: blur(3px); }
.celebration-card { position: relative; width: min(100%, 390px); overflow: hidden; padding: 42px 25px; text-align: center; border: 1px solid #b9d1f6; border-radius: 23px; background: #fff; box-shadow: 0 24px 70px rgba(21, 35, 59, .24); animation: celebrate-pop .35s ease-out; }
.celebration-card p { position: relative; margin: 0; color: var(--primary); font: 12px var(--mono); letter-spacing: .11em; }.celebration-card h2 { position: relative; margin: 10px 0 7px; color: var(--primary-dark); font-size: 30px; }.celebration-card span { position: relative; color: var(--muted); }
.celebration-confetti::before { content: "*  *  *  *  *  *  *  *  *"; position: absolute; top: 13px; left: -5%; width: 110%; color: var(--teal); font-size: 28px; letter-spacing: 11px; animation: confetti-fall 1.1s ease-in infinite alternate; }
@keyframes celebrate-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
@keyframes confetti-fall { from { transform: translateY(-12px) rotate(-3deg); } to { transform: translateY(30px) rotate(3deg); } }

/* Live auto-detection readout */
.live-guess { position: absolute; bottom: 14px; left: 50%; z-index: 3; display: flex; align-items: baseline; gap: 8px; padding: 8px 16px; color: #fff; border-radius: 999px; background: rgba(21, 35, 59, .58); backdrop-filter: blur(2px); font: 600 14px var(--font); transform: translateX(-50%); white-space: nowrap; }
.live-guess span#liveGuessConfidence { color: #bcd4ff; font: 12px var(--mono); }
.live-guess.captured { background: rgba(15, 159, 154, .85); }
.turn-badge { display: inline-block; margin-left: 8px; padding: 2px 9px; color: var(--primary-dark); border-radius: 999px; background: var(--primary-soft); font: 700 11px var(--mono); text-transform: uppercase; letter-spacing: .05em; }
