/* Cerebro 3D anclado al scroll (sección «Por dentro»).
   WebGL puro, sin dependencias: la malla se genera aquí con ruido.
   Sin WebGL o con movimiento reducido no se activa y los pasos se leen como lista. */
(() => {
  'use strict';
  const sec = document.querySelector('#por-dentro');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = sec.querySelector('.story-canvas');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) return;

  /* ---------- Ruido de Perlin 3D ---------- */
  const P = new Uint8Array(512);
  { const p = [...Array(256).keys()]; let s = 7;
    for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), mix = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  const noise = (x, y, z) => {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z), X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx; y -= fy; z -= fz;
    const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return mix(mix(mix(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), mix(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
               mix(mix(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), mix(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  /* ---------- Forma: dirección unitaria -> punto de la superficie y profundidad de surco ---------- */
  const surf = (x, y, z) => {
    let r = 1;
    const fis = Math.exp(-(x * x) / 0.006) * sm(-0.55, -0.15, y);          // cisura entre hemisferios
    r -= 0.17 * fis;
    const ax = Math.abs(x);
    const tx = ax - 0.78, ty = y + 0.38, tz = z - 0.22;                     // lóbulo temporal
    r += 0.07 * Math.exp(-(tx * tx + ty * ty + tz * tz) / 0.10);
    const cx = ax - 0.33, cy = y + 0.66, cz = z + 0.68;                     // cerebelo
    const cb = Math.exp(-(cx * cx + cy * cy + cz * cz) / 0.07);
    r += 0.06 * cb;
    // giros: los surcos caen donde un ruido deformado cruza por cero
    const wx = noise(x * 1.6 + 9.1, y * 1.6, z * 1.6) * 0.9, wy = noise(x * 1.6, y * 1.6 + 5.3, z * 1.6) * 0.9, wz = noise(x * 1.6, y * 1.6, z * 1.6 + 2.7) * 0.9;
    const f = 3.1;
    const h1 = Math.sqrt(Math.min(1, Math.abs(noise(x * f + wx, y * f + wy, z * f + wz)) / 0.2));       // giro abombado
    const h2 = Math.sqrt(Math.min(1, Math.abs(noise(x * f * 1.9 + wz + 4, y * f * 1.9 + wx, z * f * 1.9 + wy)) / 0.16));
    let groove = Math.min(1, (1 - h1) + 0.4 * (1 - h2));
    groove = groove * (1 - cb) + (0.5 + 0.5 * Math.sin(y * 85 + x * 6)) * 0.8 * cb;
    r -= 0.075 * groove * (1 - 0.6 * cb);
    const sy = 1 - 0.2 * sm(0, -0.5, y);                                     // base más plana
    return [x * r * 0.80, y * r * 0.68 * sy, z * r * 0.98, Math.max(Math.pow(groove, 1.4), fis * 0.9)];
  };
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  /* ---------- Malla: esfera a partir de un cubo, sin polos ---------- */
  const N = 100, verts = [], idx = [];
  const faces = [(u, v) => [1, v, -u], (u, v) => [-1, v, u], (u, v) => [u, 1, -v], (u, v) => [u, -1, v], (u, v) => [u, v, 1], (u, v) => [-u, v, -1]];
  faces.forEach((face, fi) => {
    const base = fi * (N + 1) * (N + 1);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const d = norm(face(i / N * 2 - 1, j / N * 2 - 1));
      const p = surf(d[0], d[1], d[2]);
      const t1 = norm(cross(Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d)), t2 = cross(d, t1), e = 0.004;
      const d1 = norm([d[0] + e * t1[0], d[1] + e * t1[1], d[2] + e * t1[2]]), d2 = norm([d[0] + e * t2[0], d[1] + e * t2[1], d[2] + e * t2[2]]);
      const p1 = surf(d1[0], d1[1], d1[2]), p2 = surf(d2[0], d2[1], d2[2]);
      let n = norm(cross([p1[0] - p[0], p1[1] - p[1], p1[2] - p[2]], [p2[0] - p[0], p2[1] - p[1], p2[2] - p[2]]));
      if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] < 0) n = [-n[0], -n[1], -n[2]];
      verts.push(p[0], p[1], p[2], n[0], n[1], n[2], p[3]);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  });

  /* ---------- Red: nodos sobre la corteza y conexiones que siguen la superficie ---------- */
  const nodes = [], net = [], pts = [];
  for (let i = 0; i < 120; i++) {
    const y = 1 - (i + 0.5) / 60, rad = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.399963;
    if (y > -0.4) nodes.push([Math.cos(a) * rad, y, Math.sin(a) * rad]);
  }
  const lift = (d) => { const p = surf(d[0], d[1], d[2]); return [p[0] * 1.03, p[1] * 1.03, p[2] * 1.03]; };
  nodes.forEach((d, i) => {
    const p = lift(d); pts.push(p[0], p[1], p[2], i / nodes.length, -1);
    nodes.map((o, j) => [j, (o[0] - d[0]) ** 2 + (o[1] - d[1]) ** 2 + (o[2] - d[2]) ** 2]).filter(o => o[0] > i).sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => {
      const o = nodes[j], ph = (i * 0.37 + j * 0.11) % 1, S = 8;
      for (let s = 0; s < S; s++) [s, s + 1].forEach(k => {
        const t = k / S, q = lift(norm([mix(d[0], o[0], t), mix(d[1], o[1], t), mix(d[2], o[2], t)]));
        net.push(q[0], q[1], q[2], ph, t);
      });
    });
  });

  /* ---------- Shaders ---------- */
  const VS_COMMON = 'uniform mat3 uRot;uniform mat4 uProj;uniform vec3 uOff;uniform float uScale,uTime;';
  // uTime se usa en ambos shaders: la precisión debe coincidir o el programa no enlaza
  const FS_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const prog = (vs, fs) => {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, src]) => {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    return { p, u };
  };
  let mesh, wire;
  try {
    mesh = prog(`attribute vec3 aPos,aNor;attribute float aCav;${VS_COMMON}uniform float uWarp;
      varying vec3 vN,vW,vM;varying float vC;
      void main(){vec3 p=aPos;
        p+=aNor*sin(p.y*7.+uTime*1.7)*sin(p.x*5.-uTime*1.3)*.035*uWarp;
        p.x+=sin(p.y*4.+uTime*2.2)*.04*uWarp;
        vM=aPos;vC=aCav;vN=uRot*aNor;vW=uRot*(p*uScale)+uOff;gl_Position=uProj*vec4(vW,1.);}`,
      `${FS_HEAD}varying vec3 vN,vW,vM;varying float vC;
      uniform float uNight,uDimF,uSplit,uTime;
      void main(){vec3 N=normalize(vN),V=normalize(-vW);
        vec3 base=mix(vec3(.62,.62,.92),vec3(.84,.80,.98),smoothstep(-.4,.6,vM.y));
        base=mix(base,vec3(.30,.22,.58),vC*.85);
        vec3 L1=normalize(vec3(.45,.75,.65)),L2=normalize(vec3(-.8,.1,.35));
        vec3 key=mix(vec3(1.,.96,.91),vec3(.42,.52,.95),uNight);
        float wrap=max((dot(N,L1)+.3)/1.3,0.);
        vec3 col=base*(key*wrap+vec3(.20,.19,.24)*max(dot(N,L2),0.)+.07);
        col*=1.-vC*.4;
        float spec=pow(max(dot(N,normalize(L1+V)),0.),70.)*(1.-vC);
        col+=key*spec*.5;
        col+=mix(vec3(.9,.55,.5),vec3(.3,.45,1.),uNight)*pow(1.-max(dot(N,V),0.),3.)*.22;
        col*=1.-uDimF*smoothstep(.05,.65,vM.z)*.72;
        float side=smoothstep(-.04,.04,vM.x);
        col=mix(col,col*mix(vec3(1.3,.86,.8)*(1.+.22*sin(uTime*24.)),vec3(.3,.34,.42),side),uSplit);
        col*=1.-uNight*.3;
        gl_FragColor=vec4(col,1.);}`);
    wire = prog(`attribute vec3 aPos;attribute vec2 aInfo;${VS_COMMON}uniform float uPt;varying vec3 vM;varying vec2 vI;
      void main(){vM=aPos;vI=aInfo;vec3 w=uRot*(aPos*uScale)+uOff;gl_Position=uProj*vec4(w,1.);gl_PointSize=uPt/-w.z;}`,
      `${FS_HEAD}varying vec3 vM;varying vec2 vI;
      uniform float uTime,uConn,uAct,uFlick,uDimF,uSplit,uNight,uIsPt;
      float hash(float n){return fract(sin(n)*43758.5453);}
      void main(){float ph=vI.x,a;
        if(uIsPt>.5){float g=smoothstep(.5,0.,length(gl_PointCoord-.5));
          a=g*g*uAct*(.65+.35*sin(uTime*2.+ph*40.))*mix(1.,step(.5,hash(floor(uTime*9.)+ph*91.)),uFlick);}
        else a=uConn*(.3+.7*smoothstep(.2,0.,abs(fract(uTime*.35+ph)-vI.y)));
        a*=1.-uDimF*smoothstep(.05,.65,vM.z)*.92;
        a*=mix(1.,mix(.5+step(.4,hash(floor(uTime*16.)+ph*57.)),.06,step(0.,vM.x)),uSplit);
        gl_FragColor=vec4(mix(vec3(1.,.96,.88),vec3(.72,.84,1.),uNight)*a,1.);}`);
  } catch (e) { console.warn('Cerebro 3D desactivado:', e.message); return; }

  const buf = (target, data) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
  const vbo = buf(gl.ARRAY_BUFFER, new Float32Array(verts)), ibo = buf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx));
  const netB = buf(gl.ARRAY_BUFFER, new Float32Array(net)), ptsB = buf(gl.ARRAY_BUFFER, new Float32Array(pts));
  const attr = (p, name, size, stride, off) => { const l = gl.getAttribLocation(p, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride * 4, off * 4); };

  /* ---------- Pasos: rotY, rotX, conexión, actividad, parpadeo, frontal apagado, noche, deformación, dos caras ---------- */
  const KEY = [
    [-1.15, .12, 1, 1, 0, 0, 0, 0, 0],
    [-.5, .2, .42, .9, .6, 0, 0, 0, 0],
    [0, .12, .4, .9, .3, 1, 0, 0, 0],
    [.95, .42, .32, .7, .3, .55, 1, 0, 0],
    [2.1, .2, .5, 1, .85, .35, .7, 1, 0],
    [6.283, .85, .6, 1, .15, 0, .2, 0, 1]
  ];
  const beats = [...sec.querySelectorAll('.beat')], track = sec.querySelector('.story-track'), stage = sec.querySelector('.story-stage'), countN = sec.querySelector('#storyN');
  const cur = KEY[0].slice(), tgt = KEY[0].slice();
  let active = -1, visible = false, last = 0, raf = 0;
  sec.classList.add('story-on');

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  const onScroll = () => {
    const total = track.offsetHeight - stage.offsetHeight;
    // cuánto ha recorrido el escenario fijo dentro de su carril
    const prog = Math.min(1, Math.max(0, (stage.getBoundingClientRect().top - track.getBoundingClientRect().top) / (total || 1)));
    const a = Math.min(KEY.length - 1, Math.floor(prog * KEY.length));
    if (a !== active) {
      active = a;
      beats.forEach((b, i) => { b.classList.toggle('on', i === a); b.classList.toggle('past', i < a); });
      countN.textContent = a + 1;
      sec.classList.toggle('story-last', a === KEY.length - 1);
    }
    const f = Math.min(KEY.length - 1, Math.max(0, prog * KEY.length - 0.5)), i = Math.min(KEY.length - 2, Math.floor(f)), t = sm(0.2, 0.8, f - i);
    for (let k = 0; k < tgt.length; k++) tgt[k] = mix(KEY[i][k], KEY[i + 1][k], t);
  };

  const frame = (now) => {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const k = 1 - Math.exp(-dt * 4.5), time = (now / 1000) % 600;
    for (let i = 0; i < cur.length; i++) cur[i] += (tgt[i] - cur[i]) * k;
    resize();
    const aspect = canvas.width / canvas.height, wide = aspect > 1.15;
    const fov = 0.6, fl = 1 / Math.tan(fov / 2), near = 0.5, far = 20;
    const proj = [fl / aspect, 0, 0, 0, 0, fl, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
    const ry = cur[0] + Math.sin(time * 0.35) * 0.09, rx = cur[1] + Math.sin(time * 0.27) * 0.03;
    const cb = Math.cos(ry), sb = Math.sin(ry), ca = Math.cos(rx), sa = Math.sin(rx);
    const rot = [cb, 0, -sb, sb * sa, ca, cb * sa, sb * ca, -sa, cb * ca];
    const halfW = Math.tan(fov / 2) * 4 * aspect;
    const off = wide ? [halfW * 0.46, 0.02, -4] : [halfW * 0.07, 0.62, -4], scale = wide ? Math.min(1.12, halfW * 0.5) : Math.min(0.7, halfW * 0.8);
    const common = (pr) => {
      gl.useProgram(pr.p);
      gl.uniformMatrix3fv(pr.u.uRot, false, rot); gl.uniformMatrix4fv(pr.u.uProj, false, proj);
      gl.uniform3fv(pr.u.uOff, off); gl.uniform1f(pr.u.uScale, scale); gl.uniform1f(pr.u.uTime, time);
      gl.uniform1f(pr.u.uDimF, cur[5]); gl.uniform1f(pr.u.uNight, cur[6]); gl.uniform1f(pr.u.uSplit, cur[8]);
    };
    gl.depthMask(true); // antes de limpiar: con la máscara cerrada no se borra la profundidad
    gl.clearColor(20 / 255, 24 / 255, 73 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
    common(mesh); gl.uniform1f(mesh.u.uWarp, cur[7]);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    attr(mesh.p, 'aPos', 3, 7, 0); attr(mesh.p, 'aNor', 3, 7, 3); attr(mesh.p, 'aCav', 1, 7, 6);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

    gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    common(wire);
    gl.uniform1f(wire.u.uConn, cur[2]); gl.uniform1f(wire.u.uAct, cur[3]); gl.uniform1f(wire.u.uFlick, cur[4]);
    gl.uniform1f(wire.u.uPt, canvas.height * 0.085 * scale);
    gl.bindBuffer(gl.ARRAY_BUFFER, netB); attr(wire.p, 'aPos', 3, 5, 0); attr(wire.p, 'aInfo', 2, 5, 3);
    gl.uniform1f(wire.u.uIsPt, 0); gl.drawArrays(gl.LINES, 0, net.length / 5);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptsB); attr(wire.p, 'aPos', 3, 5, 0); attr(wire.p, 'aInfo', 2, 5, 3);
    gl.uniform1f(wire.u.uIsPt, 1); gl.drawArrays(gl.POINTS, 0, pts.length / 5);
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(stage);
  onScroll();
})();
