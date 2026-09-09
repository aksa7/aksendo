// develop.js — the hero photograph "develops" like a darkroom print.
// Single WebGL context overlaying the hero image. Blue-noise dither resolves to
// the photo; scroll velocity warps and re-dithers; the loop pauses when idle.
// Degrades to the plain <img> beneath on any failure or weak hardware.
import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';
import { bus } from './bus.js';

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
  // liquid domain warp, scaled by velocity (>=3px rest, <=12px max)
  float amp = mix(3.0, 12.0, clamp(uVelocity,0.0,1.0));
  vec2 w = vec2(
    vnoise(vUv*6.0 + uTime*0.05),
    vnoise(vUv*6.0 - uTime*0.05 + 5.0)
  ) - 0.5;
  vec2 uv = vUv + (w * amp) / uResolution;

  float lum = texture2D(tMap, uv).r;
  float bn = texture2D(tNoise, gl_FragCoord.xy / 64.0).r;

  // coarse ordered dither (newspaper halftone) at rest state
  float dith = step(bn, lum);
  // resolved photograph
  float img = lum;

  float p = smoothstep(0.0, 1.0, uProgress);
  float v = mix(dith, img, p);
  // a touch of film grain in the mid-development
  v += (hash(vUv*uResolution + uTime) - 0.5) * 0.05 * (1.0 - p);
  gl_FragColor = vec4(vec3(clamp(v,0.0,1.0)), 1.0);
}`;

const VERT = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

export function initDevelopHero() {
  const host = document.querySelector('.hero__media[data-develop]');
  if (!host) return { dispose() {} };
  const img = host.querySelector('img');
  if (!img) return { dispose() {} };

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '1' });
  let renderer, gl, mesh, program, raf = 0, running = false, disposed = false;
  let noiseImg;

  try {
    renderer = new Renderer({ alpha: false, canvas, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    gl = renderer.gl;
  } catch { return { dispose() {} }; }

  const tMap = new Texture(gl, { generateMipmaps: false });
  const tNoise = new Texture(gl, { wrapS: gl.REPEAT, wrapT: gl.REPEAT, generateMipmaps: false });

  const setImg = () => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => { tMap.image = el; tMap.needsUpdate = true; kick(); };
    el.src = img.currentSrc || img.src;
  };
  noiseImg = new Image();
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
    renderer.setSize(r.width, r.height);
    program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  }

  // developing progress: revealed after entry, in-view factor from scroll
  let revealed = 0;
  let lastProgress = -1, idleSince = 0;

  function heroProgress() {
    const r = host.getBoundingClientRect();
    const h = r.height || 1;
    const inView = Math.min(Math.max(1 - (-r.top) / (h * 0.9), 0), 1); // 1 in view, →0 as it scrolls up
    return revealed * inView;
  }

  function frame(t) {
    if (disposed) return;
    const p = heroProgress();
    program.uniforms.uProgress.value = p;
    program.uniforms.uVelocity.value = bus.velocity;
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });

    const moving = Math.abs(p - lastProgress) > 0.0006 || bus.velocity > 0.002;
    lastProgress = p;
    if (moving) idleSince = t;
    if (t - idleSince > 400) { running = false; return; }   // draw zero frames when static
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
  img.style.opacity = '0';            // GL layer stands in; img is the fallback
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('wheel', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  // reveal the hero (called when entry finishes / immediately if no entry)
  function reveal() {
    const start = performance.now();
    const dur = 850;
    const step = (t) => {
      revealed = Math.min((t - start) / dur, 1);
      kick();
      if (revealed < 1 && !disposed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll, { capture: true });
    window.removeEventListener('wheel', onScroll);
    try {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext && ext.loseContext();
    } catch {}
    canvas.remove();
    img.style.opacity = '';           // plain photo stands
  }

  return { reveal, dispose, kick };
}
