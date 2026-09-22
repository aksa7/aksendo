// develop.js — photographs "develop" like a darkroom print (blue-noise dither → photo).
// Used on the hero and (desktop) show-row artwork thumbs. Each host gets its own
// small WebGL canvas overlay; the plain <img> always remains as the fallback.
import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';
import { bus, onHeroDevelop } from './bus.js';

const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform vec2 uResolution;
uniform float uProgress;
uniform float uVelocity;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
void main(){
  float amp = mix(3.0, 12.0, clamp(uVelocity,0.0,1.0));
  vec2 w = vec2(
    vnoise(vUv*6.0 + uTime*0.05),
    vnoise(vUv*6.0 - uTime*0.05 + 5.0)
  ) - 0.5;
  vec2 uv = vUv + (w * amp) / uResolution;

  float lum = texture2D(tMap, uv).r;
  float bn = texture2D(tNoise, gl_FragCoord.xy / 64.0).r;
  float dith = step(bn, lum);
  float img = lum;
  float p = smoothstep(0.0, 1.0, uProgress);
  float v = mix(dith, img, p);
  v += (hash(vUv*uResolution + uTime) - 0.5) * 0.05 * (1.0 - p);
  gl_FragColor = vec4(vec3(clamp(v,0.0,1.0)), 1.0);
}`;

const VERT = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

function attachDevelop(host, { progressMode = 'scroll' } = {}) {
  const img = host.querySelector('img');
  if (!img) return { dispose() {}, reveal() {}, kick() {} };

  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '1' });
  let renderer, gl, mesh, program, raf = 0, running = false, disposed = false;

  try {
    renderer = new Renderer({ alpha: false, canvas, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    gl = renderer.gl;
  } catch { return { dispose() {}, reveal() {}, kick() {} }; }

  const tMap = new Texture(gl, { generateMipmaps: false });
  const tNoise = new Texture(gl, { wrapS: gl.REPEAT, wrapT: gl.REPEAT, generateMipmaps: false });

  const setImg = () => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => { tMap.image = el; tMap.needsUpdate = true; kick(); };
    el.src = img.currentSrc || img.src;
  };
  const noiseImg = new Image();
  noiseImg.onload = () => { tNoise.image = noiseImg; tNoise.needsUpdate = true; };
  noiseImg.src = '/img/gen/bluenoise.png';

  program = new Program(gl, {
    vertex: VERT, fragment: FRAG,
    uniforms: {
      tMap: { value: tMap }, tNoise: { value: tNoise },
      uResolution: { value: [1, 1] }, uProgress: { value: 0 },
      uVelocity: { value: 0 }, uTime: { value: 0 }
    }
  });
  mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() {
    const r = host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    renderer.setSize(r.width, r.height);
    program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  }

  let revealed = progressMode === 'scroll' ? bus.heroDevelop : 1;
  let inView = 0;
  let lastProgress = -1, idleSince = 0;
  let unsubDevelop = null;

  if (progressMode === 'view') {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        inView = en.isIntersecting ? Math.min(Math.max(en.intersectionRatio * 1.4, 0), 1) : 0;
        if (en.isIntersecting) kick();
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(host);
  }

  if (progressMode === 'scroll') {
    // Entry writes bus.heroDevelop every frame via WAAPI — keep the uniform in sync.
    unsubDevelop = onHeroDevelop((p) => {
      revealed = p;
      kick();
    });
    revealed = bus.heroDevelop;
  }

  function computeProgress() {
    if (progressMode === 'view') return revealed * Math.max(inView, 0.15);
    // Hero: entry-driven develop progress × scroll visibility (stays 1 at top)
    const r = host.getBoundingClientRect();
    const h = r.height || 1;
    const vis = Math.min(Math.max(1 - (-r.top) / (h * 0.9), 0), 1);
    return bus.heroDevelop * vis;
  }

  function frame(t) {
    if (disposed) return;
    const p = computeProgress();
    program.uniforms.uProgress.value = p;
    program.uniforms.uVelocity.value = bus.velocity;
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });

    const developing = progressMode === 'scroll' && bus.heroDevelop < 0.999;
    const moving = Math.abs(p - lastProgress) > 0.0006 || bus.velocity > 0.002 || developing;
    lastProgress = p;
    if (moving) idleSince = t;
    if (t - idleSince > 400) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (running || disposed) return;
    running = true; idleSince = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const onResize = () => { resize(); kick(); };
  const onScroll = () => kick();

  resize();
  setImg();
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  img.style.opacity = '0';
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('wheel', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  function reveal() {
    // Show thumbs: short local tween. Hero develop is owned by entry → bus.heroDevelop.
    if (progressMode === 'scroll') {
      revealed = bus.heroDevelop;
      kick();
      return;
    }
    const start = performance.now();
    const dur = 850;
    const step = (t) => {
      revealed = Math.min((t - start) / dur, 1);
      kick();
      if (revealed < 1 && !disposed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setProgress(p) {
    revealed = Math.min(Math.max(p, 0), 1);
    kick();
  }

  function dispose() {
    disposed = true;
    unsubDevelop?.();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll, { capture: true });
    window.removeEventListener('wheel', onScroll);
    try {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext && ext.loseContext();
    } catch {}
    canvas.remove();
    img.style.opacity = '';
  }

  return { reveal, setProgress, dispose, kick };
}

export function initDevelopHero() {
  const host = document.querySelector('.hero__media[data-develop]');
  if (!host) return { dispose() {}, reveal() {}, kick() {} };
  return attachDevelop(host, { progressMode: 'scroll' });
}

/** Desktop show-row artwork thumbs — same dither→photo material, small scale. */
export function initDevelopShowArt() {
  const hosts = [...document.querySelectorAll('.show__art[data-develop]')];
  const layers = hosts.map((h) => attachDevelop(h, { progressMode: 'view' }));
  // Auto-reveal once in view; no entry sequence for thumbs
  layers.forEach((l) => l.reveal?.());
  return {
    dispose() { layers.forEach((l) => l.dispose?.()); },
    kick() { layers.forEach((l) => l.kick?.()); }
  };
}
