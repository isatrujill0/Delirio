/* Portada: silueta de cabeza humana hecha de partículas y filamentos que se encienden, se apagan,
   se alejan y vuelven. Alude a la atención fluctuante del delirio. WebGL puro, sin dependencias.
   No reacciona al ratón ni a los clics. Con movimiento reducido se dibuja un solo fotograma quieto. */
(() => {
  'use strict';
  const stage = document.querySelector('.hero-stage');
  const canvas = stage && stage.querySelector('.hero-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return; // sin WebGL queda el fondo de degradados con el texto
  stage.classList.add('has-gl');
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Forma: distancia firmada a una cabeza de perfil (mira hacia +x) ---------- */
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const qx = (x - cx) / rx, qy = (y - cy) / ry, qz = (z - cz) / rz;
    return (Math.sqrt(qx * qx + qy * qy + qz * qz) - 1) * Math.min(rx, ry, rz);
  };
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const head = (x, y, z) => {
    let d = ell(x, y, z, -.08, .28, 0, .8, .8, .66);               // cráneo
    d = smin(d, ell(x, y, z, .24, -.28, 0, .52, .58, .46), .28);    // cara y mandíbula
    d = smin(d, ell(x, y, z, .52, .14, 0, .2, .14, .4), .12);       // frente y cejas
    d = smin(d, ell(x, y, z, .7, -.12, 0, .1, .19, .08), .1);       // nariz
    d = smin(d, ell(x, y, z, .54, -.4, 0, .1, .07, .2), .08);       // labios
    d = smin(d, ell(x, y, z, .42, -.7, 0, .22, .16, .26), .14);     // mentón
    d = smin(d, ell(x, y, z, -.08, -1.1, 0, .36, .62, .34), .3);    // cuello
    d = smin(d, ell(x, y, z, -.1, -.05, .5, .1, .2, .1), .08);      // orejas
    d = smin(d, ell(x, y, z, -.1, -.05, -.5, .1, .2, .1), .08);
    d = smax(d, -ell(x, y, z, .62, .02, .24, .12, .08, .12), .06);  // cuencas de los ojos
    d = smax(d, -ell(x, y, z, .62, .02, -.24, .12, .08, .12), .06);
    return d;
  };

  /* ---------- Nube de puntos (semilla fija: siempre la misma figura) ---------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = [], inner = [];
  for (let t = 0; t < 900000 && pts.length < 7000; t++) {
    const x = -1 + rnd() * 1.95, y = -1.75 + rnd() * 2.9, z = -.75 + rnd() * 1.5;
    if (Math.abs(head(x, y, z)) < .014) pts.push([x, y, z]);
  }
  for (let t = 0; t < 200000 && inner.length < 1100; t++) {
    const x = -.85 + rnd() * 1.5, y = -.25 + rnd() * 1.3, z = -.6 + rnd() * 1.2;
    if (ell(x, y, z, -.08, .3, 0, .7, .68, .56) < -.02) inner.push([x, y, z]); // red interior, en el cráneo
  }

  // Filamentos: une cada punto con vecinos cercanos (rejilla espacial para no comparar todos con todos)
  const links = (list, max, per) => {
    const cell = max, grid = new Map(), key = (a, b, c) => a + ',' + b + ',' + c, out = [];
    list.forEach((p, i) => {
      const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell));
      (grid.get(k) || grid.set(k, []).get(k)).push(i);
    });
    list.forEach((p, i) => {
      if (rnd() > per) return;
      const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell), near = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++)
        (grid.get(key(cx + a, cy + b, cz + c)) || []).forEach(j => {
          if (j <= i) return;
          const q = list[j], d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
          if (d < max * max) near.push([d, j]);
        });
      near.sort((m, n) => m[0] - n[0]).slice(0, 2).forEach(([, j]) => out.push([i, j]));
    });
    return out;
  };

  // Vértices: posición (3), semilla de la partícula (1), semilla del pulso (1), tipo (1: 0 piel, 1 red interior)
  const all = pts.map(p => [...p, rnd(), 0, 0]).concat(inner.map(p => [...p, rnd(), 0, 1]));
  all.forEach(v => v[4] = v[3]);
  const off = pts.length;
  const lineIdx = links(pts, .085, .5).concat(links(inner, .2, 1).map(([a, b]) => [a + off, b + off]));
  const pointData = new Float32Array(all.flat());
  const lineData = new Float32Array(lineIdx.length * 12);
  lineIdx.forEach(([a, b], n) => {
    const pulse = rnd();
    [all[a], all[b]].forEach((v, e) => lineData.set([v[0], v[1], v[2], v[3], pulse, v[5]], n * 12 + e * 6));
  });

  /* ---------- Sombreadores ---------- */
  const VS = `
    attribute vec3 aPos; attribute float aSeed, aPulse, aKind;
    uniform float uT, uScroll, uAspect, uScale, uPx;
    uniform mediump float uLine; // misma precisión que en el fragmento, o el programa no enlaza
    varying float vA; varying vec3 vC;
    float h(float n) { return fract(sin(n * 91.345) * 47453.123); }
    void main() {
      vec3 p = aPos;
      // Deformación lenta y orgánica: la figura respira y se ondula
      p += .028 * vec3(sin(uT * .5 + p.y * 3. + aSeed * 6.), sin(uT * .41 + p.z * 3. + aSeed * 5.), sin(uT * .46 + p.x * 3.));
      // Algunas partículas se alejan y vuelven; al bajar, todas se dispersan
      vec3 dir = normalize(p - vec3(-.05, .1, 0.) + (vec3(h(aSeed), h(aSeed + 1.), h(aSeed + 2.)) - .5) * .9);
      float cyc = pow(.5 - .5 * cos(uT * .11 * (.5 + aSeed) + aSeed * 40.), 3.);
      // Los filamentos no se alejan: si un extremo se fuera solo, quedaría una raya larga
      float away = (1. - uLine) * step(.74, aSeed) * cyc * (.3 + h(aSeed + 3.)) + uScroll * uScroll * (.5 + 1.8 * h(aSeed + 4.));
      p += dir * away;
      // Giro lento de tres cuartos a perfil, sin depender del puntero
      float yaw = -.62 + .38 * sin(uT * .06), c = cos(yaw), s = sin(yaw);
      p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      p.y += .28;
      // Onda de luz que atraviesa la figura en diagonal
      float wave = exp(-pow((dot(aPos, normalize(vec3(.55, 1., .25))) - (mod(uT * .16, 4.2) - 2.1)) * 3.5, 2.));
      // Parpadeo: cada filamento o punto se enciende y se apaga a su propio ritmo
      float fl = smoothstep(.2, .95, .5 + .5 * sin(uT * (.35 + aPulse * 1.1) + aPulse * 31.));
      float z = p.z + 3.4;
      vec2 xy = p.xy * uScale * 3.4 / z;
      gl_Position = vec4(xy.x / uAspect, xy.y, 0., 1.);
      float depth = .4 + .6 * smoothstep(.9, -.9, p.z);
      float neck = smoothstep(-1.7, -1.05, aPos.y);
      float a = uLine > .5 ? (.05 + .42 * fl) * (1. - min(1., uScroll * 2.5)) : (.28 + .72 * fl) * mix(1., 1.35, aKind);
      vA = a * depth * neck * (.6 + 1.1 * wave) * (1. - smoothstep(.6, 1.8, away)) * (1. - uScroll * .5);
      vec3 blue = vec3(.42, .6, 1.), violet = vec3(.66, .5, 1.), lilac = vec3(.88, .78, 1.);
      vC = mix(mix(blue, violet, h(aSeed + 6.)), lilac, aKind * .6 + wave * .5);
      gl_PointSize = uPx * (1.1 + 2.4 * h(aSeed + 5.) + aKind * 1.2) * (1. + .8 * wave) * 3.4 / z;
    }`;
  const FS = `
    precision mediump float;
    uniform float uLine; varying float vA; varying vec3 vC;
    void main() {
      float a = vA;
      if (uLine < .5) { vec2 d = gl_PointCoord - .5; float r = dot(d, d) * 4.; if (r > 1.) discard; a *= exp(-r * 2.6); }
      gl_FragColor = vec4(vC * a, a);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { stage.classList.remove('has-gl'); return; }
  gl.useProgram(prog);
  const U = n => gl.getUniformLocation(prog, n);
  const uT = U('uT'), uScroll = U('uScroll'), uAspect = U('uAspect'), uScale = U('uScale'), uPx = U('uPx'), uLine = U('uLine');
  const attrs = [['aPos', 3, 0], ['aSeed', 1, 3], ['aPulse', 1, 4], ['aKind', 1, 5]].map(([n, size, at]) => [gl.getAttribLocation(prog, n), size, at]);
  const buf = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
  const pBuf = buf(pointData), lBuf = buf(lineData);
  const bind = b => { gl.bindBuffer(gl.ARRAY_BUFFER, b); attrs.forEach(([loc, size, at]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 24, at * 4); }); };
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // suma de luz: donde se juntan filamentos, brilla más

  /* ---------- Bucle ---------- */
  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.round(canvas.clientWidth * dpr); h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  const draw = t => {
    const aspect = w / Math.max(h, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, t);
    gl.uniform1f(uScroll, Math.min(1, scrollY / Math.max(innerHeight, 1)));
    gl.uniform1f(uAspect, aspect);
    gl.uniform1f(uScale, Math.min(.62, .7 * aspect + .1)); // en pantallas estrechas la figura cabe a lo ancho
    gl.uniform1f(uPx, dpr * Math.min(1.25, Math.max(.8, h / dpr / 800)));
    bind(lBuf); gl.uniform1f(uLine, 1); gl.drawArrays(gl.LINES, 0, lineIdx.length * 2);
    bind(pBuf); gl.uniform1f(uLine, 0); gl.drawArrays(gl.POINTS, 0, all.length);
  };
  let raf = 0, visible = true, t0 = performance.now();
  const loop = now => { raf = 0; draw((now - t0) / 1000 + 20); if (visible && !still.matches && !document.hidden) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  resize();
  new ResizeObserver(() => { resize(); kick(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(stage);
  document.addEventListener('visibilitychange', kick);
  addEventListener('scroll', () => { if (still.matches) kick(); }, { passive: true });
  still.addEventListener('change', kick);
  kick();
})();
