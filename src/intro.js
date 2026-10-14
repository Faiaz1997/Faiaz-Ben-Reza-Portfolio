/* Intro screen: the Thor storm poster inside #loader, with a slow push-in, flickering lightning and a thunder flash. */
import posterUrl from './intro-poster.jpg?url';

export const INTRO_MIN_MS = 3200;

const loader = document.getElementById('loader');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.createElement('canvas'); canvas.id = 'intro-art'; canvas.setAttribute('aria-hidden', 'true');
loader?.prepend(canvas);
const ctx = canvas.getContext('2d');
const poster = new Image();
let W = 0, H = 0, raf = 0, ready = false;
const t0 = performance.now();

function frame(now) {
  const el = (now - t0) / 1000;
  const iw = poster.naturalWidth, ih = poster.naturalHeight;
  const zoom = (reduced ? 1 : 1 + Math.min(el, 6) * .012) * Math.max(W / iw, H / ih);
  const dw = iw * zoom, dh = ih * zoom;
  const fx = .55, fy = .4; // keep the hero in frame while the camera pushes in
  const dx = Math.min(0, Math.max(W - dw, W * fx - dw * fx)), dy = Math.min(0, Math.max(H - dh, H * fy - dh * fy));
  ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.drawImage(poster, dx, dy, dw, dh);

  // Lightning flicker: re-add only the brightest parts of the poster (the bolts) on top, at a jittering strength.
  const flicker = reduced ? .35 : Math.max(0, .35 + .45 * Math.sin(el * 19) * Math.sin(el * 6.1) + (Math.sin(el * 47) > .85 ? .5 : 0));
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, flicker);
  ctx.filter = 'brightness(1.35) contrast(2.2) blur(1.5px)';
  ctx.drawImage(poster, dx, dy, dw, dh);
  ctx.filter = 'none';

  // Thunder flash every few seconds, centred on the hero.
  const phase = el % 2.4, flash = reduced ? 0 : Math.max(0, 1 - phase * 5) * (Math.sin(phase * 60) * .3 + .7);
  if (flash > 0) {
    const g = ctx.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, Math.max(W, H) * .7);
    g.addColorStop(0, `rgba(210,255,252,${.5 * flash})`); g.addColorStop(1, `rgba(120,220,230,${.12 * flash})`);
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // Vignette plus a dark base so the loading text stays readable, and a fade in from black.
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,10,18,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const b = ctx.createLinearGradient(0, H * .7, 0, H); b.addColorStop(0, 'rgba(0,8,14,0)'); b.addColorStop(1, 'rgba(0,8,14,.7)');
  ctx.fillStyle = b; ctx.fillRect(0, H * .7, W, H * .3);
  if (el < .6) { ctx.fillStyle = `rgba(0,0,0,${1 - el / .6})`; ctx.fillRect(0, 0, W, H); }
  if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = canvas.width = Math.round(innerWidth * dpr); H = canvas.height = Math.round(innerHeight * dpr);
  if (ready) { cancelAnimationFrame(raf); frame(performance.now()); }
}

if (ctx && loader) {
  addEventListener('resize', resize); resize();
  poster.onload = () => { ready = true; cancelAnimationFrame(raf); frame(performance.now()); };
  poster.src = posterUrl;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduced && ready) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
  new MutationObserver(() => {
    const cl = document.documentElement.classList;
    if (cl.contains('world-ready') || cl.contains('no-world')) setTimeout(() => cancelAnimationFrame(raf), 700);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
