(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const root = document.documentElement;
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- Tema ---------- */
  const themeBtn = $('#themeToggle');
  const setTheme = (t) => {
    root.dataset.theme = t;
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    safe(() => localStorage.setItem('theme', t));
  };
  setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  // Fundido entre claro y oscuro: evita un salto brusco de brillo (si el navegador lo admite y no se pide menos movimiento)
  themeBtn.addEventListener('click', () => {
    const next = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { const vt = document.startViewTransition(next); [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p && p.catch(() => {})); } // un fundido saltado o cortado no es un error
    else next();
  });

  /* ---------- Cabecera sobre la portada ---------- */
  const stage = $('.hero-stage');
  if (stage) {
    const header = $('.site-header');
    // Sobre la portada la cabecera toma los colores oscuros (.night) para leerse sobre la escena
    const onHero = () => { const on = scrollY < stage.offsetHeight - header.offsetHeight - 40; root.classList.toggle('on-hero', on); header.classList.toggle('night', on); };
    onHero();
    addEventListener('scroll', onHero, { passive: true });
    addEventListener('resize', onHero);
  }

  /* ---------- Tamaño de texto ---------- */
  const sizes = ['100%', '112%', '125%'];
  let si = Number(safe(() => localStorage.getItem('fs'))) || 0;
  const sizeBtn = $('#textSize'), navBar = $('.nav');
  // Si con el texto ampliado la barra no cabe, se pliega en el menú (los botones de la derecha siguen visibles)
  const fitNav = () => {
    root.classList.remove('nav-compact');
    if (navBar.scrollWidth > navBar.clientWidth + 1) root.classList.add('nav-compact');
  };
  addEventListener('resize', fitNav);
  safe(() => document.fonts.ready.then(fitNav));
  const applySize = () => {
    root.style.setProperty('--fs', sizes[si]);
    fitNav();
    sizeBtn.setAttribute('aria-label', `Cambiar tamaño de texto (ahora ${sizes[si]})`);
    safe(() => localStorage.setItem('fs', si));
  };
  applySize();
  sizeBtn.addEventListener('click', () => { si = (si + 1) % sizes.length; applySize(); });

  /* ---------- Menú móvil ---------- */
  const toggle = $('.nav-toggle'), menu = $('#menu');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Recorridos por público y «siguiente sección» ---------- */
  const ROUTES = { fam: 'Familias', est: 'Estudiantes', pro: 'Profesionales' };
  const sections = $$('main section[data-lines]');
  const routeBtns = $$('[data-route-btn]');
  const linesLabel = $('#linesLabel');

  sections.forEach((sec) => {
    $('.serves', sec).insertAdjacentHTML('afterend', '<p class="off-note" hidden>Esta sección no está en tu recorrido. Puedes leerla o seguir a la siguiente.</p>');
    $$('.container', sec).pop().insertAdjacentHTML('beforeend', `<a class="next" href="#top"><span class="next-k"></span><span class="next-t"></span>${icon('i-down')}</a>`);
  });

  const setRoute = (r) => {
    const route = ROUTES[r] ? r : '';
    route ? root.dataset.route = route : delete root.dataset.route;
    safe(() => route ? localStorage.setItem('route', route) : localStorage.removeItem('route'));
    routeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.routeBtn === route));
    linesLabel.textContent = route ? `Tu recorrido: ${ROUTES[route]}. Las secciones de otros públicos siguen disponibles.` : 'Tres recorridos, un mismo tema';
    sections.forEach((sec, i) => {
      const onRoute = !route || sec.dataset.lines.split(' ').includes(route);
      $('.off-note', sec).hidden = onRoute;
      const nextSec = sections.slice(i + 1).find(s => !route || s.dataset.lines.split(' ').includes(route));
      const a = $('.next', sec);
      a.className = 'next' + (route ? ' ' + route : '');
      a.href = nextSec ? '#' + nextSec.id : '#top';
      $('.next-k', a).textContent = !nextSec ? 'Fin del recorrido' : route ? `Recorrido ${ROUTES[route]}` : 'Siguiente';
      $('.next-t', a).textContent = nextSec ? nextSec.dataset.title : 'Volver al inicio';
      $('use', a).setAttribute('href', nextSec ? '#i-down' : '#i-up');
    });
  };
  setRoute(root.dataset.route);
  routeBtns.forEach(b => b.addEventListener('click', () => setRoute(root.dataset.route === b.dataset.routeBtn ? '' : b.dataset.routeBtn)));
  $$('[data-go]').forEach(a => a.addEventListener('click', () => setRoute(a.dataset.go)));

  /* ---------- Entradas al hacer scroll ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    root.classList.add('rv-on');
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in', 'seen'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    $$('.rows, .defs, .studies, .links, .rooms, .accordion, .flow-steps').forEach(g => {
      [...g.children].forEach((c, k) => { c.classList.add('rv'); c.style.setProperty('--i', Math.min(k, 8)); });
      io.observe(g);
    });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- Intro: aparece NEXO y la pantalla se abre ---------- */
  if (root.classList.contains('intro-on')) {
    const intro = $('#intro');
    const done = () => { root.classList.remove('intro-on'); safe(() => sessionStorage.setItem('intro', '1')); };
    intro.addEventListener('animationend', (e) => { if (e.animationName === 'open') done(); });
    intro.addEventListener('click', done);
    addEventListener('keydown', done, { once: true });
    setTimeout(done, 4200); // por si el navegador no anima la máscara
  }

  /* ---------- Movimiento ligado al scroll: objeto que viaja, bloques que se reparten, títulos ---------- */
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const ease = (t) => t * t * (3 - 2 * t);
  console.assert(ease(0) === 0 && ease(1) === 1 && ease(.5) === .5 && clamp01(2) === 1, 'ease() roto');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('moving');
    const travel = $('.travel'), hero = $('#inicio');
    // data-obj de cada sección: x (% del ancho), y (% del alto), escala, giro, opacidad
    const stops = $$('main section[data-obj]').map(el => ({ el, v: el.dataset.obj.split(' ').map(Number), top: 0 }));
    const spreads = $$('.spread').map(el => ({ el, top: 0 })), heads = $$('.section-head').map(el => ({ el, top: 0, land: 0 }));
    const heroCopy = $('.hero-copy', hero);
    let copyTop = 0, copyH = 1, headH = 0, maxScroll = 0;
    const place = () => {
      stops.forEach(st => st.top = st.el.getBoundingClientRect().top + scrollY);
      // Posición en el documento de títulos y grupos (sus contenedores no se transforman) y
      // dónde queda cada título al llegar desde el menú (scroll-padding-top + relleno de la sección)
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      heads.forEach(h => {
        const r = h.el.getBoundingClientRect(), sec = h.el.closest('section');
        h.top = r.top + scrollY;
        h.land = pad + (sec ? r.top - sec.getBoundingClientRect().top : 0);
      });
      spreads.forEach(g => g.top = g.el.getBoundingClientRect().top + scrollY);
      headH = $('.site-header').offsetHeight;
      copyTop = hero.getBoundingClientRect().top + scrollY + heroCopy.offsetTop;
      copyH = heroCopy.offsetHeight || 1;
      maxScroll = Math.max(0, root.scrollHeight - innerHeight);
      // Distancia de cada tarjeta al centro de su grupo (offset* ignora los transform)
      spreads.forEach(({ el: g }) => {
        const cx = g.clientWidth / 2, cy = g.clientHeight / 2;
        [...g.children].forEach((c, k) => {
          c.style.setProperty('--dx', Math.round(cx - c.offsetLeft - c.offsetWidth / 2) + 'px');
          c.style.setProperty('--dy', Math.round(cy - c.offsetTop - c.offsetHeight / 2) + 'px');
          c.style.setProperty('--i', k);
          c.style.setProperty('--r', (k % 2 ? 7 : -7) + 'deg');
        });
      });
    };
    let queued = false;
    const frame = () => {
      queued = false;
      const vh = innerHeight, mid = scrollY + vh / 2, small = innerWidth < 700;
      hero.style.setProperty('--hx', clamp01(scrollY / vh).toFixed(3));
      // La portada solo se desvanece cuando más de la mitad ya quedó bajo la cabecera
      hero.style.setProperty('--hf', clamp01(((scrollY + headH - copyTop) / copyH - .5) / .5).toFixed(3));
      // Progreso 0→1 mientras el borde superior sube de vh a «fin». El fin nunca queda por debajo
      // de donde el elemento puede descansar: al llegar desde el menú (land) ni al final de la página.
      const prog = (docTop, end) => {
        const top = docTop - scrollY, rest = docTop - maxScroll;
        return clamp01((vh - top) / Math.max(1, vh - Math.max(end, rest)));
      };
      // Todo lo que queda en el 70 % superior de la ventana ya está en su sitio y opaco
      spreads.forEach(g => g.el.style.setProperty('--q', prog(g.top, vh * .7).toFixed(3)));
      heads.forEach(h => h.el.style.setProperty('--h', prog(h.top, Math.max(vh * .7, h.land)).toFixed(3)));
      // El objeto se queda quieto casi toda la sección y al final viaja al sitio de la siguiente
      let i = stops.length - 1;
      while (i > 0 && stops[i].top > mid) i--;
      const nx = stops[i + 1] || stops[i];
      const t = nx === stops[i] ? 0 : ease(clamp01(((mid - stops[i].top) / (nx.top - stops[i].top) - .45) / .55));
      const [x, y, sc, rot, op] = stops[i].v.map((n, k) => n + (nx.v[k] - n) * t);
      travel.style.transform = `translate(calc(${x}vw - 50%), calc(${y}vh - 50%)) scale(${(sc * (small ? .7 : 1)).toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      travel.style.opacity = (op * (small ? .5 : 1)).toFixed(3);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    place(); frame();
    addEventListener('scroll', queue, { passive: true });
    const replace = () => { place(); queue(); };
    new ResizeObserver(replace).observe($('main'));
    addEventListener('resize', replace);
  }

  /* ---------- Dónde estás ---------- */
  const links = $$('.nav-links a');
  const hereName = $('#hereName');
  const spy = new IntersectionObserver((entries) => entries.forEach(en => {
    if (!en.isIntersecting) return;
    hereName.textContent = en.target.dataset.title;
    links.forEach(a => {
      const on = a.getAttribute('href') === '#' + en.target.id;
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
    });
  }), { rootMargin: '-40% 0px -55% 0px' });
  $$('main section[data-title]').forEach(s => spy.observe(s));

  /* ---------- Dos habitaciones, la misma noche ---------- */
  // Cada hora: [atención 0-10, lo que pasa, lo que queda anotado, luz de llamada]
  const HOURS = ['20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00'];
  const NIGHT = {
    r7: [
      [9, 'Conversa con su hija y cena.', '', 0],
      [9, 'Ve la televisión. Sabe dónde está.', '', 0],
      [7, 'Inquieto. Pregunta dos veces qué hora es.', '', 0],
      [4, 'No reconoce la habitación. Intenta levantarse.', 'Inquieto. Se reorienta.', 1],
      [3, 'Dice que hay gente en la pared. Tira de la vía.', 'Agitado. Intenta retirarse la vía.', 1],
      [2, 'Grita que quiere irse. Se arranca la sonda.', 'Agitación. Se avisa a guardia.', 1],
      [3, 'Sedado tras el episodio. Murmura.', 'Se administra sedación.', 1],
      [4, 'Duerme a ratos, con sobresaltos.', '', 0],
      [3, 'Despierta desorientado. Llama a alguien que no está.', 'Desorientado.', 1],
      [5, 'Más tranquilo. Mira a su alrededor.', '', 0],
      [6, 'Dormita.', '', 0],
      [7, 'Despierta y reconoce a la enfermera.', '', 0],
      [8, 'Ronda médica: contesta bien.', 'Noche agitada. Ahora lúcido.', 0]
    ],
    r8: [
      [9, 'Conversa y cena con apetito.', '', 0],
      [8, 'Lee un rato.', '', 0],
      [6, 'Deja el libro. Contesta con monosílabos.', '', 0],
      [4, 'Tarda en responder. Pierde el hilo a mitad de frase.', '', 0],
      [3, 'Ojos abiertos, mirada fija. No sigue la conversación.', '', 0],
      [2, 'No responde al hablarle; sí al tocarle el hombro.', 'Duerme.', 0],
      [2, 'Sigue igual. No pide nada.', '', 0],
      [2, 'Le cambian de postura: ni protesta ni colabora.', 'Tranquilo. Sin incidencias.', 0],
      [2, 'Mirada perdida.', '', 0],
      [3, 'Abre los ojos al oír su nombre y vuelve a cerrarlos.', '', 0],
      [3, 'No toca el desayuno.', 'Poco apetito.', 0],
      [4, 'Contesta despacio: «sí… no sé».', '', 0],
      [6, 'Ronda médica: responde lo justo.', 'Buena noche. Sin cambios.', 0]
    ]
  };
  // Frecuencia cardiaca que marca el monitor cada hora
  const HR = { r7: [78, 76, 84, 102, 118, 132, 96, 88, 110, 92, 84, 80, 78], r8: [74, 72, 72, 70, 70, 68, 68, 66, 68, 68, 70, 70, 72] };
  const LOW = 5; // atención igual o por debajo: un cribado la detectaría
  const range = $('#simRange');
  if (range) {
    const rooms = $$('.room').map(el => ({ el, data: NIGHT[el.dataset.room], hr: HR[el.dataset.room], f: (k) => $(`[data-f="${k}"]`, el) }));
    rooms.forEach(r => $('.trace', r.el).innerHTML = r.data.map(h => `<i style="--a:${h[0]}"></i>`).join(''));
    const playBtn = $('#simPlay'), verdict = $('#simVerdict');
    let timer = null;
    const count = (data, i, test) => data.slice(0, i + 1).filter(test).length;
    const render = () => {
      const i = +range.value;
      $('#simHour').textContent = HOURS[i];
      range.setAttribute('aria-valuetext', HOURS[i]);
      $('#simPrev').disabled = i === 0;
      $('#simNext').disabled = i === HOURS.length - 1;
      rooms.forEach(({ el, data, hr, f }) => {
        const alarm = hr[i] > 120;
        f('hr').textContent = hr[i];
        $('.monitor', el).style.setProperty('--beat', (60 / hr[i]).toFixed(2) + 's');
        el.classList.toggle('alarm', alarm);
        f('mon').textContent = alarm ? 'Taquicardia: salta la alarma del monitor.' : 'El monitor no marca nada anormal.';
        $$('.trace i', el).forEach((b, j) => {
          b.classList.toggle('on', j <= i);
          b.classList.toggle('low', data[j][0] <= LOW);
          b.classList.toggle('cur', j === i);
        });
        f('do').textContent = data[i][1];
        const notes = data.map((h, j) => [HOURS[j], h[2]]).slice(0, i + 1).filter(n => n[1]);
        f('log').innerHTML = notes.length ? notes.map(n => `<li><time>${n[0]}</time><span>${n[1]}</span></li>`).join('') : '<li class="none">Nada todavía.</li>';
        f('calls').textContent = count(data, i, h => h[3]);
        f('low').textContent = count(data, i, h => h[0] <= LOW);
        const calling = !!data[i][3];
        el.classList.toggle('calling', calling);
        $('.call span', el).textContent = calling ? 'Luz de llamada encendida' : 'Luz de llamada apagada';
      });
      const last = HOURS.length - 1;
      verdict.textContent = i < last
        ? 'Avanza hasta las 08:00 para ver qué queda escrito de cada noche.'
        : `A las 08:00 las dos hojas dicen que el paciente está bien. La habitación 7 recibió ${count(NIGHT.r7, last, h => h[3])} avisos; la 8, ninguno. Los dos pasaron la noche con delirio.`;
    };
    const stop = () => {
      clearInterval(timer); timer = null;
      playBtn.innerHTML = icon('i-play') + '<span>Recorrer la noche</span>';
    };
    const step = (d) => { range.value = Math.min(HOURS.length - 1, Math.max(0, +range.value + d)); render(); };
    range.addEventListener('input', () => { stop(); render(); });
    $('#simPrev').addEventListener('click', () => { stop(); step(-1); });
    $('#simNext').addEventListener('click', () => { stop(); step(1); });
    playBtn.addEventListener('click', () => {
      if (timer) return stop();
      if (+range.value === HOURS.length - 1) range.value = 0;
      render();
      playBtn.innerHTML = icon('i-pause') + '<span>Pausar</span>';
      timer = setInterval(() => { step(1); if (+range.value === HOURS.length - 1) stop(); }, 1300);
    });
    render();
  }

  /* ---------- Prueba de las letras (rasgo 2 del CAM-ICU) ---------- */
  const SEQ = 'CASABLANCA';
  // Error: no apretar con una A, o apretar con otra letra
  const isError = (ch, pressed) => (ch === 'A') !== !!pressed;
  const score = (seq, pressed) => [...seq].filter((ch, i) => isError(ch, pressed[i])).length;
  console.assert(score(SEQ, [0, 1, 0, 1, 0, 0, 1, 0, 0, 1]) === 0 && score(SEQ, []) === 4 && score('AB', [0, 1]) === 2, 'score() roto');

  const ltStart = $('#ltStart');
  if (ltStart) {
    const squeeze = $('#ltSqueeze'), letter = $('#ltLetter'), cells = $('#ltCells'), result = $('#ltResult');
    let idx = -1, pressed = [], tick = null;
    cells.innerHTML = [...SEQ].map(() => '<li></li>').join('');
    const cell = (i) => cells.children[i];
    const reset = () => {
      clearInterval(tick); tick = null; idx = -1; pressed = [];
      $$('li', cells).forEach(li => { li.textContent = ''; li.className = ''; li.removeAttribute('aria-label'); });
      letter.textContent = 'A'; letter.classList.add('idle');
      squeeze.disabled = true;
      ltStart.textContent = 'Empezar la prueba';
    };
    const finish = () => {
      clearInterval(tick); tick = null;
      [...SEQ].forEach((ch, i) => {
        const bad = isError(ch, pressed[i]);
        cell(i).className = bad ? 'bad' : pressed[i] ? 'hit' : '';
        cell(i).setAttribute('aria-label', `${ch}: ${bad ? 'error' : pressed[i] ? 'apretó, correcto' : 'correcto'}`);
      });
      const n = score(SEQ, pressed);
      letter.textContent = n; letter.classList.remove('idle');
      squeeze.disabled = true;
      ltStart.textContent = 'Repetir la prueba';
      result.textContent = (n === 1 ? '1 error. ' : `${n} errores. `) + (n > 2
        ? 'Con más de 2, el rasgo 2 (inatención) está presente.'
        : 'Con 2 o menos, la atención se considera conservada.') + ' Es una demostración, no un diagnóstico.';
    };
    const advance = () => {
      idx++;
      if (idx >= SEQ.length) return finish();
      letter.textContent = SEQ[idx];
      cell(idx).textContent = SEQ[idx];
    };
    ltStart.addEventListener('click', () => {
      if (tick) { reset(); result.textContent = 'Prueba detenida.'; return; }
      reset();
      result.textContent = 'Atento a las letras: aprieta solo con la A.';
      letter.classList.remove('idle'); letter.textContent = '';
      squeeze.disabled = false; squeeze.focus();
      ltStart.textContent = 'Detener';
      tick = setInterval(advance, 1500);
    });
    squeeze.addEventListener('click', () => {
      if (idx < 0 || idx >= SEQ.length || pressed[idx]) return;
      pressed[idx] = true;
      cell(idx).classList.add('hit');
      squeeze.classList.add('pressed');
      setTimeout(() => squeeze.classList.remove('pressed'), 180);
    });
    reset();
  }

  /* ---------- Reloj: fecha, hora y momento del día (inicio y Station) ---------- */
  const clock = () => {
    const d = new Date(), h = d.getHours();
    const day = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    $$('[data-today]').forEach(e => e.textContent = day);
    $$('[data-now]').forEach(e => e.textContent = time);
    $$('[data-daypart]').forEach(e => e.textContent = h < 6 || h >= 20 ? 'Es de noche, momento de descansar.' : h < 12 ? 'Es de mañana.' : 'Es de tarde.');
  };
  clock(); setInterval(clock, 15000);

  /* ---------- NEXO Station (maqueta): pestañas, sonido simulado, llamada y modos ---------- */
  const st = $('#stationUi');
  if (st) {
    const tabs = $$('[role="tab"]', st), status = $('#stStatus'), msgBtn = $('#stMsgBtn'), msgTime = $('#stMsgTime');
    const tracks = $$('#stMundo button');
    const say = (t) => { status.textContent = t; };
    const BARS = [8, 16, 24, 12, 20, 26, 10, 18, 22, 9, 15, 25, 13, 19, 7, 21];
    $$('.st-wave', st).forEach(w => w.innerHTML = BARS.slice(0, w.classList.contains('eqs') ? 6 : 16).map(h => `<i style="--h:${h}"></i>`).join(''));

    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); select(tabs[e.key === 'Home' ? 0 : tabs.length - 1], true); }
      });
    });

    // Un solo «altavoz»: o el mensaje de la familia o un sonido de Mi mundo
    const MSG_LEN = 42;
    let source = null, last = 'msg', sec = 0, timer = null, callT = null;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const paint = () => {
      const msgOn = source === 'msg';
      $('#stMsg').classList.toggle('playing', msgOn);
      msgBtn.innerHTML = icon(msgOn ? 'i-pause' : 'i-play');
      msgBtn.setAttribute('aria-label', msgOn ? 'Pausar el mensaje de tu familia' : 'Reproducir el mensaje de tu familia');
      msgTime.textContent = fmt(sec);
      tracks.forEach(b => { b.setAttribute('aria-pressed', source === b); b.classList.toggle('playing', source === b); });
    };
    const stop = (quiet) => {
      clearInterval(timer); timer = null;
      if (source && !quiet) say('En pausa.');
      source = null; paint();
    };
    const play = (src) => {
      stop(true); source = last = src;
      if (src === 'msg') {
        if (sec >= MSG_LEN) sec = 0;
        timer = setInterval(() => { sec++; if (sec >= MSG_LEN) { stop(true); say('El mensaje terminó.'); } paint(); }, 1000);
        say('Reproduciendo el mensaje de tu familia (simulado).');
      } else say(`Sonando: ${src.dataset.track} (simulado).`);
      paint();
    };
    msgBtn.addEventListener('click', () => source === 'msg' ? stop() : play('msg'));
    tracks.forEach(b => b.addEventListener('click', () => source === b ? stop() : play(b)));
    $$('[data-hw]', st).forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.hw;
      if (a === 'pause') return source ? stop() : say('No hay nada sonando.');
      if (a === 'play') { select(tabs[last === 'msg' ? 1 : 2]); return play(last); }
      st.classList.add('calling'); clearTimeout(callT);
      say('Aviso enviado al personal de enfermería (simulado). La luz indica que alguien viene.');
      callT = setTimeout(() => st.classList.remove('calling'), 6000);
    }));
    const MODES = { autonomo: 'Modo autónomo', asistido: 'Modo asistido', programado: 'Modo programado' };
    $('#stModes').addEventListener('change', (e) => { st.dataset.mode = e.target.value; $('#stBadge').textContent = MODES[e.target.value]; });
    paint();
  }

  /* ---------- Flujo de una cápsula: de la casa a la cabecera ---------- */
  const flow = $('#flow');
  if (flow) {
    const steps = $$('.flow-steps button', flow), bars = $$('.flow-bar i', flow), playB = $('#flowPlay');
    let cur = 0, ft = null;
    flow.classList.add('flow-on');
    const showStep = (i) => {
      cur = i;
      steps.forEach((b, j) => b.setAttribute('aria-pressed', j === i));
      bars.forEach((b, j) => b.classList.toggle('on', j <= i));
      $('#flowWho').textContent = steps[i].dataset.who;
      $('#flowT').textContent = $('span:last-child', steps[i]).textContent;
      $('#flowD').textContent = steps[i].nextElementSibling.textContent;
      $('#flowPrev').disabled = i === 0;
      $('#flowNext').disabled = i === steps.length - 1;
    };
    const halt = () => { clearInterval(ft); ft = null; playB.innerHTML = icon('i-play') + '<span>Seguir una cápsula</span>'; };
    steps.forEach((b, i) => b.addEventListener('click', () => { halt(); showStep(i); }));
    $('#flowPrev').addEventListener('click', () => { halt(); showStep(cur - 1); });
    $('#flowNext').addEventListener('click', () => { halt(); showStep(cur + 1); });
    playB.addEventListener('click', () => {
      if (ft) return halt();
      showStep(cur === steps.length - 1 ? 0 : cur);
      playB.innerHTML = icon('i-pause') + '<span>Pausar</span>';
      ft = setInterval(() => cur < steps.length - 1 ? showStep(cur + 1) : halt(), 2600);
    });
    showStep(0);
  }

  /* ---------- Evidencia: filtro, abrir todos y enlaces directos ---------- */
  const studies = $$('.study'), filter = $('#filtroEv'), allBtn = $('#toggleAll'), evCount = $('#evCount');
  const visible = () => studies.filter(s => !s.hidden);
  const syncAll = () => {
    const allOpen = visible().every(s => s.open);
    allBtn.textContent = allOpen ? 'Cerrar todos' : 'Abrir todos';
    allBtn.setAttribute('aria-pressed', allOpen);
  };
  const applyFilter = () => {
    studies.forEach(s => s.hidden = filter.value !== 'todos' && s.dataset.tag !== filter.value);
    const n = visible().length;
    evCount.textContent = n === 1 ? '1 estudio' : `${n} estudios`;
    syncAll();
  };
  filter.addEventListener('change', applyFilter);
  allBtn.addEventListener('click', () => {
    const open = !visible().every(s => s.open);
    visible().forEach(s => s.open = open);
    syncAll();
  });
  studies.forEach(s => s.addEventListener('toggle', syncAll));
  // Un enlace a #ev-… abre ese estudio aunque el filtro lo oculte
  const openTarget = () => {
    const t = location.hash.startsWith('#ev-') && safe(() => $(location.hash));
    if (!t) return;
    if (t.hidden) { filter.value = 'todos'; applyFilter(); }
    t.open = true;
    t.scrollIntoView();
  };
  addEventListener('hashchange', openTarget);
  applyFilter(); openTarget();

  /* ---------- Formulario de historias (demostración) ---------- */
  const form = $('#storyForm'), txt = $('#historia'), count = $('#count');
  txt.addEventListener('input', () => count.textContent = txt.value.length + ' / 1200');
  const show = (id, bad, input) => {
    $('#' + id).hidden = !bad;
    bad ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rol = $('#rol'), cons = $('#consent');
    const badRol = !rol.value, badTxt = txt.value.trim().length < 20, badCons = !cons.checked;
    show('err-rol', badRol, rol); show('err-historia', badTxt, txt); show('err-consent', badCons, cons);
    const firstBad = badRol ? rol : badTxt ? txt : badCons ? cons : null;
    $('#formOk').hidden = !!firstBad;
    if (firstBad) return firstBad.focus();
    form.reset(); count.textContent = '0 / 1200';
  });
  form.addEventListener('input', () => $('#formOk').hidden = true);
})();
