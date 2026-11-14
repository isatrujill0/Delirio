(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Tema ---------- */
  const themeBtn = $('#themeToggle');
  const savedTheme = safe(() => localStorage.getItem('theme'));
  const initial = savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const setTheme = (t) => {
    root.dataset.theme = t;
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    safe(() => localStorage.setItem('theme', t));
  };
  setTheme(initial);
  themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ---------- Tamaño de texto ---------- */
  const sizes = ['100%', '112%', '125%'];
  let si = Number(safe(() => localStorage.getItem('fs')) || 0);
  const applySize = () => { root.style.setProperty('--fs', sizes[si]); safe(() => localStorage.setItem('fs', si)); };
  applySize();
  $('#textSize').addEventListener('click', () => { si = (si + 1) % sizes.length; applySize(); });

  /* ---------- Menú móvil ---------- */
  const toggle = $('.nav-toggle'), menu = $('#menu');
  const closeMenu = () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Progreso de lectura + enlace activo ---------- */
  const bar = $('#progressBar');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const links = $$('.nav-links a');
  const secIds = links.map(a => a.getAttribute('href'));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => {
          const on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('active', on);
          on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
        });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secIds.forEach(id => { const s = $(id); if (s) spy.observe(s); });
  // la sección de intro cuenta como "Inicio"
  const intro = $('#intro'); if (intro) spy.observe(intro);

  /* ---------- Revelado al hacer scroll ---------- */
  const rev = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$('.reveal').forEach(el => rev.observe(el));

  /* ---------- Contadores ---------- */
  const counters = $$('.stat-num');
  const countObs = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = pre + end + suf; }
    else {
      const t0 = performance.now(), dur = 1200;
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    countObs.unobserve(el);
  }), { threshold: 0.6 });
  counters.forEach(c => { c.textContent = (c.dataset.prefix || '') + '0' + (c.dataset.suffix || ''); countObs.observe(c); });

  /* ---------- Tabs accesibles ---------- */
  $$('[data-tabs]').forEach(wrap => {
    const tabs = $$('[role="tab"]', wrap), panels = $$('[role="tabpanel"]', wrap);
    const select = (i, focus) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => p.hidden = i !== j);
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowDown') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (k === 'ArrowUp') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
        if (k === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (k === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
        if (k === 'Home') { e.preventDefault(); select(0, true); }
        if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
  });

  /* ---------- Paciente interactivo ---------- */
  const rng = $('#cmpRange'), stage = $('#cmpStage'), cdesc = $('#cmpDesc'), badge = $('#actBadge');
  if (rng) {
    const stages = [
      ['Tranquilo', 'Tranquilo: el paciente descansa, está orientado y colabora con los cuidados.'],
      ['Inquieto', 'Inquieto: empieza la fluctuación. Duerme poco, se muestra intranquilo y pregunta dónde está.'],
      ['Confuso con alucinaciones', 'Confuso: aparecen ideas extrañas y alucinaciones. Ve y oye cosas que no están ahí y siente miedo.'],
      ['Delirio hiperactivo', 'Agitado: grita, intenta quitarse sondas y catéteres y puede lastimarse. No es voluntario: necesita cuidado sin juicio.']
    ];
    const upd = () => {
      const v = +rng.value;
      const s = v < 20 ? 0 : v < 45 ? 1 : v < 75 ? 2 : 3;
      stage.style.setProperty('--lvl', v / 100);
      stage.dataset.stage = s;
      badge.textContent = stages[s][0];
      cdesc.textContent = stages[s][1];
      rng.setAttribute('aria-valuetext', stages[s][0]);
    };
    rng.addEventListener('input', upd); upd();
  }

  /* ---------- Delirio hipoactivo ---------- */
  const hr = $('#hypoRange');
  if (hr) {
    const wrap = $('#hypoWrap'), hs = $('#hypoStage'), hb = $('#hypoBadge'), hd = $('#hypoDesc');
    const hstages = [
      ['Alerta', 'Despierto: conversa, come con apetito y responde. Las redes cerebrales trabajan coordinadas.'],
      ['Más lento y callado', 'Más lento: cuesta mantener la atención, habla menos y deja comida en el plato.'],
      ['Apagado y somnoliento', 'Apagado: apenas responde, la bandeja queda sin tocar. Se cree que las redes cerebrales se “desconectan” y baja la atención.'],
      ['Delirio hipoactivo: pasa desapercibido', 'Cerebro en “modo ahorro”: casi no habla, no come y duerme. Como no hay ruido ni agitación, el equipo y la familia pueden pensar que solo está cansado.']
    ];
    const meters = { att: 90, rsp: 85, app: 92, ale: 80, vis: 100 };
    const items = $$('#meters li');
    const hupd = () => {
      const v = +hr.value, l = v / 100;
      const s = v < 20 ? 0 : v < 45 ? 1 : v < 75 ? 2 : 3;
      wrap.style.setProperty('--lvl', l);
      hs.dataset.stage = s;
      hb.textContent = hstages[s][0];
      hd.textContent = hstages[s][1];
      hr.setAttribute('aria-valuetext', hstages[s][0]);
      items.forEach(li => {
        const val = Math.max(6, Math.round(100 - l * meters[li.dataset.k]));
        $('i', li).style.width = val + '%';
        $('b', li).textContent = val + '%';
      });
    };
    hr.addEventListener('input', hupd); hupd();
  }

  /* ---------- Mosaico ---------- */
  $$('.tile').forEach(t => t.addEventListener('click', () => {
    t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true');
  }));

  /* ---------- Botón flotante: se oculta sobre testimonios ---------- */
  const fab = $('.fab'), testi = $('#testimonios');
  if (fab && testi) new IntersectionObserver(([e]) => fab.classList.toggle('hide', e.isIntersecting)).observe(testi);

  /* ---------- Acordeón (uno abierto a la vez) ---------- */
  $$('[data-accordion]').forEach(acc => {
    $$('details', acc).forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$('details', acc).forEach(o => { if (o !== d) o.open = false; });
    }));
  });

  /* ---------- Evidencia: filtro y expandir todo ---------- */
  const studies = $$('.study');
  $('#filtroEv').addEventListener('change', (e) => {
    studies.forEach(s => s.hidden = e.target.value !== 'todos' && s.dataset.tag !== e.target.value);
  });
  const allBtn = $('#toggleAll');
  allBtn.addEventListener('click', () => {
    const open = allBtn.textContent.trim() === 'Expandir todo';
    studies.forEach(s => s.open = open);
    allBtn.textContent = open ? 'Contraer todo' : 'Expandir todo';
  });

  /* ---------- Carrusel ---------- */
  $$('[data-carousel]').forEach(car => {
    const slides = $$('.slide', car), dots = $('.dots', car);
    let idx = 0, timer;
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Testimonio ' + (i + 1));
      b.addEventListener('click', () => { go(i); restart(); });
      dots.appendChild(b);
    });
    const go = (i) => {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, j) => { s.classList.toggle('is-active', j === idx); s.setAttribute('aria-hidden', j !== idx); });
      $$('button', dots).forEach((b, j) => b.setAttribute('aria-selected', j === idx));
    };
    const restart = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(idx + 1), 8000); };
    $('[data-prev]', car).addEventListener('click', () => { go(idx - 1); restart(); });
    $('[data-next]', car).addEventListener('click', () => { go(idx + 1); restart(); });
    car.addEventListener('mouseenter', () => clearInterval(timer));
    car.addEventListener('mouseleave', restart);
    car.addEventListener('focusin', () => clearInterval(timer));
    go(0); restart();
  });

  /* ---------- Formulario de historias (simulado) ---------- */
  const form = $('#storyForm');
  const txt = $('#historia'), count = $('#count');
  txt.addEventListener('input', () => count.textContent = txt.value.length + ' / 1200');
  const show = (id, bad, input) => {
    $('#' + id).hidden = !bad;
    if (input) bad ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rol = $('#rol'), cons = $('#consent');
    const badRol = !rol.value, badTxt = txt.value.trim().length < 20, badCons = !cons.checked;
    show('err-rol', badRol, rol); show('err-historia', badTxt, txt); show('err-consent', badCons, cons);
    const firstBad = badRol ? rol : badTxt ? txt : badCons ? cons : null;
    if (firstBad) { firstBad.focus(); $('#formOk').hidden = true; return; }
    form.reset(); count.textContent = '0 / 1200';
    $('#formOk').hidden = false;
  });

  /* ---------- Newsletter (simulado) ---------- */
  $('#newsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const em = $('#email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value);
    show('err-email', !ok, em);
    $('#newsOk').hidden = !ok;
    if (ok) e.target.reset(); else em.focus();
  });
})();
