/* La Noche del Gopher · repaso de Halloween de Go.
   Todo el contenido llega cifrado (AES-GCM) en datos.js. Cada sala es una cadena: la pregunta siguiente se abre con
   la llave que deja la anterior resuelta, y el porqué solo se abre con el conjunto exacto de opciones correctas, así
   que fallar no muestra cuál era la buena. Las opciones se barajan cada vez que aparece una pregunta.
   Mientras el juego está en curso, salir de la página (otra pestaña, otra aplicación, otra ventana o recargar) lo
   bloquea y lo reinicia desde el principio; al intentar cerrar o recargar, el navegador pide confirmar. */
(() => {
  'use strict';
  const D = window.REPASO, app = document.getElementById('app'), imp = document.getElementById('impresion');
  const CLAVE = 'noche-gopher', MARCA = CLAVE + ':en-curso', CERT = CLAVE + ':certificado', PROG = CLAVE + ':progreso';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const TIPO = { om: 'Opción múltiple', vf: 'Verdadero o falso', sm: 'Selección múltiple' };
  const COLOR = { naranja: '#E8620C', verde: '#2E8B3E', morado: '#6B2FA0' };
  let M = null, E = estadoNuevo(), S = null, ocupado = false, wake = null, cert = null, canal = null;

  function estadoNuevo(nombre = '', apellido = '') { return { nombre, apellido, enCurso: false, salas: [null, null, null] }; }

  /* las salas superadas quedan guardadas en el dispositivo, a nombre de quien las jugó: salir de la página solo
     reinicia la sala en curso, y al volver con el mismo nombre se sigue donde quedó */
  const clave = (n, a) => `${n} ${a}`.toLocaleLowerCase('es');
  function leerProgreso() { try { const p = JSON.parse(localStorage.getItem(PROG) || '{}'); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  function guardar(borrar = false) {                          // uno por nombre: en un computador compartido cada quien conserva el suyo
    const p = leerProgreso(), k = clave(E.nombre, E.apellido);
    if (borrar) delete p[k]; else p[k] = E.salas.map(r => r && { primer: r.primer, fin: r.fin });
    try { localStorage.setItem(PROG, JSON.stringify(p)); } catch { }
  }
  function cargar(nombre, apellido) {
    const E2 = estadoNuevo(nombre, apellido), p = leerProgreso()[clave(nombre, apellido)];
    if (Array.isArray(p))
      M.salas.forEach((s, t) => {
        const r = p[t];
        if (r && Array.isArray(r.primer) && r.primer.length === s.n && typeof r.fin === 'string')
          E2.salas[t] = { primer: r.primer, aciertos: r.primer.filter(Boolean).length, fin: r.fin };
      });
    return E2;
  }

  /* ---------------- arte (SVG, sin emojis) ---------------- */
  /* el gopher (dibujo propio, el mismo de los juegos anteriores) con sombrero de bruja */
  function gopherSvg(cara = 'feliz') {
    const K = '#1b2a3a', C = '#6AD7E5', T = w => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const blanco = `<circle cx="44" cy="45" r="14" fill="#fff" ${T(3)}/><circle cx="76" cy="45" r="14" fill="#fff" ${T(3)}/>`;
    const pup = (dx, dy, r = 6) => `<circle cx="${44 + dx}" cy="${45 + dy}" r="${r}" fill="${K}"/><circle cx="${76 + dx}" cy="${45 + dy}" r="${r}" fill="${K}"/>
      <circle cx="${46 + dx}" cy="${43 + dy}" r="2" fill="#fff"/><circle cx="${78 + dx}" cy="${43 + dy}" r="2" fill="#fff"/>`;
    const ojos = { feliz: `<path d="M33 48 Q44 34 55 48 M65 48 Q76 34 87 48" fill="none" ${T(4)}/>`, asustado: blanco + pup(0, 0, 4),
      enojado: blanco + pup(0, 2) + `<path d="M32 25 L52 32 M68 32 L88 25" ${T(4)}/>`, pensando: blanco + pup(2, -6) }[cara];
    const hocico = `<ellipse cx="60" cy="70" rx="13" ry="9" fill="#F6D2A2" ${T(3)}/><ellipse cx="60" cy="64" rx="6" ry="4" fill="#3b2a20"/>`;
    const boca = cara === 'asustado' ? `<ellipse cx="60" cy="81" rx="5" ry="6" fill="${K}"/>` : `<path d="M54 76 h12 v9 h-12 Z M60 76 v9" fill="#fff" ${T(2.5)}/>`;
    const sombrero = `<ellipse cx="60" cy="26" rx="42" ry="7" fill="#2a1240" ${T(3)}/>
      <path d="M37 25 C44 6 56 -10 76 -23 C70 -4 78 10 85 25 Z" fill="#4B1D6E" ${T(3)}/>
      <path d="M40 18 Q61 23 83 18" fill="none" stroke="#FF7A18" stroke-width="5"/><rect x="56" y="14" width="10" height="9" rx="1.5" fill="none" stroke="#FFD34D" stroke-width="2.4"/>`;
    return `<svg class="gopher ${cara}" viewBox="0 -26 120 162" aria-hidden="true"><g>
      <circle cx="30" cy="24" r="9" fill="${C}" ${T(3)}/><circle cx="90" cy="24" r="9" fill="${C}" ${T(3)}/>
      <ellipse cx="21" cy="86" rx="6" ry="11" fill="${C}" ${T(3)} transform="rotate(20 21 86)"/><ellipse cx="99" cy="86" rx="6" ry="11" fill="${C}" ${T(3)} transform="rotate(-20 99 86)"/>
      <path d="M22 62 C22 28 42 14 60 14 C78 14 98 28 98 62 L98 106 C98 121 84 127 60 127 C36 127 22 121 22 106 Z" fill="${C}" ${T(3)}/>
      <ellipse cx="44" cy="127" rx="11" ry="5" fill="#F6D2A2" ${T(3)}/><ellipse cx="76" cy="127" rx="11" ry="5" fill="#F6D2A2" ${T(3)}/>
      ${ojos}${hocico}${boca}${sombrero}</g></svg>`;
  }
  const P_FANTASMA = 'M50 4C27 4 12 21 12 46v58l9.5-8 9.5 8 9.5-8 9.5 8 9.5-8 9.5 8 9.5-8 9.5 8V46C88 21 73 4 50 4z';
  const P_MURCIELAGO = 'M50 14c-3-6-7-6-8-2-6-9-20-12-30-6 8 1 12 6 12 12-5-3-12-2-16 3 9-1 17 3 21 9 3-5 8-7 13-6l8 8 8-8c5-1 10 1 13 6 4-6 12-10 21-9-4-5-11-6-16-3 0-6 4-11 12-12-10-6-24-3-30 6-1-4-5-4-8 2z';
  const ART = {
    calabaza: (luz, cls = '') => `<svg class="calabaza ${luz ? 'luz' : ''} ${cls}" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M31 13c0-5 4-8 9-8" stroke="${luz ? '#3d7a1e' : '#4a4060'}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="21" cy="38" rx="15" ry="20" fill="${luz ? '#e8620c' : '#2c2340'}"/><ellipse cx="43" cy="38" rx="15" ry="20" fill="${luz ? '#e8620c' : '#2c2340'}"/>
      <ellipse cx="32" cy="38" rx="14" ry="21" fill="${luz ? '#ff7a18' : '#3a2e54'}"/>
      <path d="M20 34l6-8 6 8zM34 34l6-8 6 8zM19 44q13 11 26 0l-4 1-3-3-3 3-3-3-3 3-3-3-3 3z" fill="${luz ? '#ffd34d' : '#1c1529'}"/></svg>`,
    gopher: gopherSvg,
    fantasma: (cara = 'feliz') => {
      const ojo = cara === 'asustado' ? 9 : 7.5;
      const boca = { feliz: '<path d="M38 62q12 12 24 0" stroke="#1b1029" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        asustado: '<ellipse cx="50" cy="67" rx="7" ry="9" fill="#1b1029"/>',
        enojado: '<path d="M39 70q11-9 22 0" stroke="#1b1029" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        pensando: '<path d="M42 66h16" stroke="#1b1029" stroke-width="4.5" stroke-linecap="round"/>' }[cara];
      return `<svg class="fantasma ${cara}" viewBox="0 0 100 112" aria-hidden="true"><path d="${P_FANTASMA}" fill="#f4f0ff"/>
        <ellipse cx="37" cy="44" rx="6" ry="${ojo}" fill="#1b1029"/><ellipse cx="63" cy="44" rx="6" ry="${ojo}" fill="#1b1029"/>
        ${cara === 'enojado' ? '<path d="M28 31l14 7M72 31l-14 7" stroke="#1b1029" stroke-width="4" stroke-linecap="round"/>' : ''}${boca}
        <ellipse cx="27" cy="56" rx="5" ry="3" fill="#ffb3c7" opacity=".7"/><ellipse cx="73" cy="56" rx="5" ry="3" fill="#ffb3c7" opacity=".7"/></svg>`;
    },
    puerta: () => `<svg class="puerta" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 60V26a18 18 0 0136 0v34z" fill="#3a2350" stroke="#ff7a18" stroke-width="3"/>
      <path d="M32 10v50M14 34h36M14 46h36" stroke="#ff7a18" stroke-width="2" opacity=".5"/><circle cx="40" cy="41" r="2.6" fill="#ffd34d"/></svg>`,
    candado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0110 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="currentColor"/></svg>',
    impresora: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8.5L19 7v14.5H6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12.5 10.5v6.5M9.5 14l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------------- utilidades ---------------- */
  function barajar(a) {
    const b = a.slice(), r = new Uint32Array(b.length);
    crypto.getRandomValues(r);
    for (let i = b.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }
  const total = () => M.salas.reduce((s, x) => s + x.n, 0);
  const rango = () => { const n = M.salas.map(s => s.n), a = Math.min(...n), b = Math.max(...n); return a === b ? a : `${a} o ${b}`; };
  function pantalla(html) { app.innerHTML = html; window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
  async function pedirPantalla() { try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; } }
  function soltarPantalla() { try { wake?.release(); } catch { } wake = null; }
  function marcar(estado) {
    if (estado) sessionStorage.setItem(MARCA, JSON.stringify({ estado, nombre: E.nombre, apellido: E.apellido, sala: S ? M.salas[S.t].sala : '' }));
    else sessionStorage.removeItem(MARCA);
  }
  const avisoGuardia = () => `<p class="guardia">${ART.candado}<span>No abra otras pestañas ni cambie de aplicación hasta terminar: si sale de esta página, la sala que esté jugando se reinicia desde la primera pregunta. Las salas que ya superó quedan guardadas.</span></p>`;

  /* ---------------- guardia: no salir de la página mientras el juego está en curso ---------------- */
  function vigilar() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') violar();
      else if (E.enCurso) pedirPantalla();
    });
    window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) violar(); }, 250));
    window.addEventListener('beforeunload', ev => { if (E.enCurso) { ev.preventDefault(); ev.returnValue = ''; } });   // cerrar o recargar: pide confirmar
    if ('BroadcastChannel' in window) {                       // el mismo juego abierto en otra pestaña
      canal = new BroadcastChannel(CLAVE);                    // referencia fija: que no se recoja como basura
      canal.onmessage = ev => { if (ev.data === 'abierta') violar(); };
      canal.postMessage('abierta');
    }
  }
  function violar() {
    if (!E.enCurso) return;
    const sala = S ? M.salas[S.t].sala : '';
    marcar('bloqueado');                                      // antes de soltar S: si está recargando, anota qué sala perdió
    E.enCurso = false; S = null; ocupado = false;               // solo se pierde la sala en curso
    soltarPantalla();
    salon(); bloqueo(sala);
  }
  function bloqueo(sala) {
    $('.bloqueo')?.remove();
    const hechas = E.salas.filter(Boolean).length;
    const perdio = sala ? `La sala «${esc(sala)}» se reinició: vuelve a empezar desde la primera pregunta.` : 'No estaba dentro de ninguna sala, así que no perdió avance.';
    const guardadas = !hechas ? '' : hechas === 1 ? ' Su sala superada sigue guardada.' : ` Sus ${hechas} salas superadas siguen guardadas.`;
    const d = document.createElement('div');
    d.className = 'bloqueo'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'bq-t');
    d.innerHTML = `<div class="caja">${ART.gopher('enojado')}<p class="rotulo">${ART.candado} Juego bloqueado</p>
      <h2 id="bq-t">Usted salió de la página durante la ejecución del juego.</h2>
      <p>Abrir otra pestaña, cambiar de aplicación, abrir otra ventana o recargar la página bloquea el juego. ${perdio}${guardadas}</p>
      <button class="btn" id="reiniciar">Volver al salón</button></div>`;
    document.body.append(d);
    d.querySelector('#reiniciar').onclick = () => {
      d.remove();
      if (!E.nombre) return portada();
      E.enCurso = true; marcar('en-curso'); pedirPantalla(); salon();
    };
    d.querySelector('#reiniciar').focus();
  }

  /* ---------------- portada y registro ---------------- */
  function portada() {
    const previo = JSON.parse(localStorage.getItem(CERT) || 'null');
    pantalla(`<section class="portada">
      <div class="guia-grande">${ART.gopher('feliz')}</div>
      <h1 class="logo">La Noche del Gopher</h1>
      <p class="sub">Repaso de Halloween en Go</p>
      <p class="lema">Tres salas embrujadas y ${total()} preguntas de teoría: slices y maps, objetos y UML, y structs.</p>
      <ul class="reglas">
        <li>${ART.calabaza(true)}<span>Cada sala trae ${rango()} preguntas de opción múltiple, verdadero o falso y selección múltiple.</span></li>
        <li>${ART.calabaza(true)}<span>Si falla, vuelve a intentarlo. Solo cuenta como acierto lo que resuelve al primer intento.</span></li>
        <li>${ART.calabaza(true)}<span>Al superar las tres salas obtiene su certificado, para imprimir o descargar en PDF.</span></li>
        <li class="alerta">${ART.candado}<span>No puede salir de la página mientras juega: si abre otra pestaña, cambia de aplicación o recarga, la sala que esté jugando se reinicia. Las salas que ya superó quedan guardadas.</span></li>
      </ul>
      <form id="registro" class="tarjeta registro" autocomplete="off" novalidate>
        <h2>¿Quién se atreve a entrar?</h2>
        <label>Nombres<input id="nombre" maxlength="40" value="${esc(E.nombre)}" autocomplete="given-name"></label>
        <label>Apellidos<input id="apellido" maxlength="40" value="${esc(E.apellido)}" autocomplete="family-name"></label>
        <p class="nota" id="nota">Su nombre aparecerá en el certificado: escríbalo completo y con tildes.${Object.keys(leerProgreso()).length
          ? ' Si ya superó salas en este dispositivo, escriba el mismo nombre y seguirá donde quedó.' : ''}</p>
        <button class="btn" type="submit">Empezar el juego</button>
      </form>
      ${previo ? '<button class="btn-link" id="ver-cert">Ver mi último certificado</button>' : ''}
    </section>`);
    $('#registro').onsubmit = ev => {
      ev.preventDefault();
      const limpio = s => s.replace(/\s+/g, ' ').trim();
      const n = limpio($('#nombre').value), a = limpio($('#apellido').value);
      if (n.length < 2 || a.length < 2) { $('#nota').textContent = 'Escriba sus nombres y sus apellidos para continuar.'; $('#nota').classList.add('error'); return; }
      E = cargar(n, a); E.enCurso = true; marcar('en-curso'); pedirPantalla(); salon();
    };
    if (previo) $('#ver-cert').onclick = () => verCertificado(previo, false);
  }

  /* ---------------- salón: elegir sala ---------------- */
  function salon() {
    if (E.salas.every(Boolean)) return certificado();
    pantalla(`<section class="salon">
      <header class="cab"><span class="logo-chico">La Noche del Gopher</span><span class="quien">${esc(E.nombre)} ${esc(E.apellido)}</span></header>
      <h1>Elija una sala</h1>
      <p class="intro">Supere las tres salas para obtener su certificado. Puede entrar en el orden que quiera.</p>
      <div class="salas">${M.salas.map((s, t) => {
        const r = E.salas[t];
        return `<article class="sala c-${s.color} ${r ? 'hecha' : ''}">
          <div class="ico">${r ? ART.calabaza(true) : ART.puerta()}</div>
          <div class="txt"><h2>${esc(s.sala)}</h2><p class="tema">${esc(s.tema)}</p>
            <p class="estado">${r ? `Superada · ${r.aciertos} de ${s.n} al primer intento` : `${s.n} preguntas`}</p></div>
          ${r ? '<span class="sello">Superada</span>' : `<button class="btn" data-sala="${t}">Entrar</button>`}</article>`;
      }).join('')}</div>
      ${avisoGuardia()}
    </section>`);
    app.querySelectorAll('[data-sala]').forEach(b => b.onclick = () => entrar(+b.dataset.sala));
  }

  /* ---------------- preguntas ---------------- */
  async function entrar(t) {
    const K = await Cifra.huella(D.sal, 'sala', t);
    if (!E.enCurso) return;                                   // se bloqueó mientras se abría
    S = { t, i: 0, K, primer: [] };
    marcar('en-curso');                                       // si recarga, el aviso dice qué sala se reinició
    pregunta();
  }
  async function pregunta() {
    const s = M.salas[S.t], esta = S;
    const pub = await Cifra.abrir(await Cifra.llave(S.K, 'preg', S.t, S.i), D.salas[S.t][S.i].c);
    if (S !== esta) return;                                   // el repaso se reinició mientras se abría
    Object.assign(S, { pub, intentos: 0, resuelta: false, sel: new Set(), probado: new Set(), orden: pub.tipo === 'vf' ? pub.o : barajar(pub.o) });
    const indic = { om: 'Elija una opción.', vf: 'Elija verdadero o falso.', sm: `Marque las ${pub.n} opciones correctas.` }[pub.tipo];
    pantalla(`<section class="preg c-${s.color}">
      <header class="cab"><span class="logo-chico">${esc(s.sala)}</span><span class="paso">Pregunta ${S.i + 1} de ${s.n}</span></header>
      <div class="calabazas" role="img" aria-label="Avance: ${S.i} de ${s.n} preguntas resueltas">${Array.from({ length: s.n }, (_, k) => ART.calabaza(k < S.i, k === S.i ? 'actual' : '')).join('')}</div>
      <article class="tarjeta">
        <p class="tipo">${TIPO[pub.tipo]}</p>
        <h2 class="enun">${fmt(pub.e)}</h2>
        <p class="indic">${indic}</p>
        <div class="opciones ${pub.tipo}" role="group" aria-label="Opciones">${S.orden.map((o, k) => `<button class="op" data-id="${o.id}" aria-pressed="false">
          <span class="letra">${pub.tipo === 'vf' ? (k ? 'F' : 'V') : 'ABCDE'[k]}</span><span class="t">${fmt(o.t)}</span></button>`).join('')}</div>
        <div id="fb" class="fb" aria-live="assertive"></div>
        <div class="acciones"><button class="btn" id="comprobar">Comprobar</button></div>
      </article>
      <div class="guia">${ART.gopher('pensando')}</div>
    </section>`);
    app.querySelectorAll('.op').forEach(b => b.onclick = () => elegir(b));
    $('#comprobar').onclick = comprobar;
  }
  function elegir(b) {
    if (S.resuelta || b.disabled) return;
    const id = b.dataset.id;
    if (S.pub.tipo === 'sm') { S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); }
    else S.sel = new Set([id]);
    app.querySelectorAll('.op').forEach(o => o.setAttribute('aria-pressed', S.sel.has(o.dataset.id)));
    if ($('#fb').classList.contains('aviso')) { $('#fb').className = 'fb'; $('#fb').innerHTML = ''; }
  }
  /* Comprobar nunca queda desactivado: si la selección no se puede calificar, dice por qué y no cuenta como intento */
  function avisar(texto) {
    const fb = $('#fb');
    fb.className = 'fb aviso'; fb.innerHTML = `<p>${texto}</p>`;
    fb.classList.remove('sacude'); void fb.offsetWidth; fb.classList.add('sacude');
  }
  async function comprobar() {
    if (S.resuelta || ocupado) return;
    const canon = [...S.sel].sort().join(',');
    if (!S.sel.size) return avisar(S.pub.tipo === 'sm' ? `Marque ${S.pub.n} opciones antes de comprobar.` : 'Elija una opción antes de comprobar.');
    if (S.pub.tipo === 'sm' && S.sel.size !== S.pub.n)
      return avisar(`Marque exactamente ${S.pub.n} opciones: ahora tiene ${S.sel.size} marcada${S.sel.size === 1 ? '' : 's'}.`);
    if (S.probado.has(canon)) return avisar('Ya probó esa combinación y no es la respuesta. Cambie al menos una opción y vuelva a comprobar.');
    ocupado = true; $('#comprobar').disabled = true;
    const esta = S;
    let fin = null;
    try { fin = await Cifra.abrir(await Cifra.llave(S.K, 'fin', S.t, S.i, canon), D.salas[S.t][S.i].x); } catch { fin = null; }
    ocupado = false;
    if (S !== esta) return;
    fin ? acierto(fin) : fallo(canon);
  }
  function fallo(canon) {
    S.intentos++; S.probado.add(canon);
    if (S.pub.tipo !== 'sm') {                                // una sola opción: queda descartada
      const b = app.querySelector(`.op[data-id="${[...S.sel][0]}"]`);
      b.classList.add('descartada'); b.disabled = true; b.setAttribute('aria-pressed', 'false'); S.sel.clear();
    }
    $('.guia').innerHTML = ART.gopher('asustado');
    $('#comprobar').disabled = false;
    const fb = $('#fb');
    fb.className = 'fb mal'; fb.innerHTML = `<h3>No es la respuesta</h3><p>${S.pub.tipo === 'sm'
      ? 'Al menos una de las opciones que marcó no es correcta. Cambie la que no corresponde y vuelva a comprobar.'
      : 'Esa opción quedó descartada. Revise la pregunta y vuelva a intentarlo.'}</p>`;
    fb.classList.remove('sacude'); void fb.offsetWidth; fb.classList.add('sacude');
  }
  function acierto(fin) {
    S.resuelta = true; S.primer[S.i] = S.intentos === 0; S.sig = fin.sig;
    app.querySelectorAll('.op').forEach(o => { o.disabled = true; if (S.sel.has(o.dataset.id)) o.classList.add('bien'); });
    $('.guia').innerHTML = ART.gopher('feliz');
    const ultima = S.i + 1 === M.salas[S.t].n, fb = $('#fb');
    fb.className = 'fb bien';
    fb.innerHTML = `<h3>¡Correcto!</h3><p class="intento">${S.intentos ? `Lo logró en el intento ${S.intentos + 1}.` : 'Al primer intento.'}</p>
      <p class="pq"><b>${S.pub.tipo === 'sm' ? 'Por qué son correctas' : 'Por qué es correcta'}:</b> ${fmt(fin.porque)}</p>`;
    const acc = app.querySelector('.acciones');
    acc.innerHTML = `<button class="btn" id="seguir">${ultima ? 'Terminar la sala' : 'Siguiente pregunta'}</button>`;
    $('#seguir').onclick = () => { S.K = S.sig; S.i++; ultima ? terminarSala() : pregunta(); };
    fb.scrollIntoView({ block: 'nearest' });
  }
  function terminarSala() {
    const s = M.salas[S.t], aciertos = S.primer.filter(Boolean).length;
    E.salas[S.t] = { aciertos, primer: S.primer, fin: S.K };
    const todas = E.salas.every(Boolean);
    S = null; guardar();
    if (todas) { E.enCurso = false; marcar(null); soltarPantalla(); }   // terminó: ya no hay sala que perder
    else marcar('en-curso');
    pantalla(`<section class="fin-sala c-${s.color}">
      <div class="guia-grande">${ART.gopher('feliz')}</div>
      <h1>¡Sala superada!</h1>
      <p class="intro">${esc(s.sala)} · ${esc(s.tema)}</p>
      <div class="calabazas grandes" role="img" aria-label="${aciertos} de ${s.n} al primer intento">${Array.from({ length: s.n }, (_, k) => ART.calabaza(k < aciertos)).join('')}</div>
      <p class="marcador"><b>${aciertos} de ${s.n}</b> al primer intento</p>
      <button class="btn" id="seguir">${todas ? 'Ver mi certificado' : 'Volver al salón'}</button>
      ${todas ? '' : avisoGuardia()}
    </section>`);
    $('#seguir').onclick = salon;
  }

  /* ---------------- certificado ---------------- */
  async function certificado() {
    E.enCurso = false; marcar(null); soltarPantalla();
    const fecha = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
    const aciertos = E.salas.map(r => r.aciertos);
    const h = await Cifra.huella(CLAVE, ...E.salas.map(r => r.fin), E.nombre, E.apellido, fecha, aciertos.join('-'));
    const C = { nombre: E.nombre, apellido: E.apellido, fecha, aciertos, codigo: h.slice(0, 10).toUpperCase().replace(/(.{5})/, '$1-') };
    try { localStorage.setItem(CERT, JSON.stringify(C)); } catch { }
    guardar(true);                                            // terminado: si vuelve a jugar, empieza de cero
    verCertificado(C, true);
  }
  async function verCertificado(C, recien) {
    cert = C;
    await fuentes();
    const c = lienzo(C), url = c.toDataURL('image/png');
    imp.innerHTML = `<img src="${url}" alt="">`;
    const n = total(), ok = C.aciertos.reduce((a, b) => a + b, 0);
    pantalla(`<section class="cert-pantalla">
      ${recien ? `<div class="guia-grande">${ART.gopher('feliz')}</div><h1>¡Sobrevivió a la noche del Gopher!</h1><p class="intro">Superó las tres salas. Este es su certificado:</p>`
        : '<h1>Su último certificado</h1>'}
      <img class="cert-img" src="${url}" alt="Certificado de culminación de ${esc(C.nombre)} ${esc(C.apellido)}: ${ok} de ${n} al primer intento.">
      <div class="acciones">
        <button class="btn" id="imprimir">${ART.impresora} Imprimir certificado</button>
        <button class="btn btn-2" id="pdf">${ART.pdf} Descargar PDF</button>
      </div>
      <p class="nota" id="nota-pdf" aria-live="polite">En el celular, «Imprimir» abre la opción de imprimir o de guardar como PDF.</p>
      <table class="resumen"><thead><tr><th>Sala</th><th>Al primer intento</th></tr></thead><tbody>
        ${M.salas.map((s, k) => `<tr><td><b>${esc(s.sala)}</b><br><span>${esc(s.tema)}</span></td><td>${C.aciertos[k]} de ${s.n}</td></tr>`).join('')}
        <tr class="tot"><td>Total</td><td>${ok} de ${n}</td></tr></tbody></table>
      <button class="btn-link" id="otra">Jugar otra vez</button>
    </section>`);
    $('#imprimir').onclick = () => window.print();
    $('#pdf').onclick = async () => {
      const b = $('#pdf'); b.disabled = true;
      try {
        const u = URL.createObjectURL(pdfBlob(c)), a = document.createElement('a');
        a.href = u; a.download = archivoPDF(C); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 30000);
        $('#nota-pdf').textContent = 'PDF listo: ' + archivoPDF(C);
      } catch { $('#nota-pdf').textContent = 'No se pudo crear el PDF en este navegador: use «Imprimir certificado».'; }
      finally { b.disabled = false; }
    };
    $('#otra').onclick = () => { E = estadoNuevo(C.nombre, C.apellido); portada(); };
  }
  async function fuentes() {
    try { await Promise.race([document.fonts.load('120px Creepster'), new Promise(r => setTimeout(r, 2500))]); } catch { }
  }
  const archivoPDF = C => `Certificado-Noche-del-Gopher-${C.nombre}-${C.apellido}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf';

  /* el certificado se dibuja en un lienzo A4 horizontal: el mismo dibujo se imprime y va dentro del PDF */
  function lienzo(C) {
    const W = 1754, H = 1240, c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = W; c.height = H;
    const SERIF = 'Georgia, "Times New Roman", serif', TIT = 'Creepster, Georgia, serif';
    const F = (peso, t, fam = SERIF) => `${peso} ${t}px ${fam}`;
    const ajusta = (t, max, peso, t0, fam = SERIF) => { let s = t0; x.font = F(peso, s, fam); while (x.measureText(t).width > max && s > 22) x.font = F(peso, --s, fam); return x.font; };
    const centro = (t, y, f, col, cx = W / 2) => { x.font = f; x.fillStyle = col; x.textAlign = 'center'; x.fillText(t, cx, y); };
    const caja = (x0, y0, w, h, r) => {
      x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.closePath();
    };
    const lineas = (t, max) => {
      const out = []; let l = '';
      for (const p of t.split(' ')) { const k = l ? l + ' ' + p : p; if (x.measureText(k).width > max && l) { out.push(l); l = p; } else l = k; }
      return [...out, l];
    };
    // fondo, marcos y adornos
    x.fillStyle = '#FFF9EF'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#E8620C'; x.lineWidth = 18; x.strokeRect(36, 36, W - 72, H - 72);
    x.strokeStyle = '#4B1D6E'; x.lineWidth = 4; x.strokeRect(68, 68, W - 136, H - 136);
    telarana(x, 70, 70, 1); telarana(x, W - 70, 70, -1);
    figura(x, P_MURCIELAGO, 330, 120, 1.1, '#4B1D6E'); figura(x, P_MURCIELAGO, 430, 175, .7, '#4B1D6E');
    figura(x, P_MURCIELAGO, W - 440, 130, .9, '#4B1D6E'); figura(x, P_MURCIELAGO, W - 360, 190, .6, '#4B1D6E');
    // texto principal
    centro('Certificado', 255, F(400, 150, TIT), '#E8620C');
    x.save(); if ('letterSpacing' in x) x.letterSpacing = '10px'; centro('DE CULMINACIÓN', 320, F(700, 34), '#4B1D6E'); x.restore();
    centro('Se certifica que', 405, F(400, 36), '#3A2A4A');
    const quien = `${C.nombre} ${C.apellido}`;
    x.font = ajusta(quien, W - 380, 700, 88); x.fillStyle = '#24123A'; x.textAlign = 'center'; x.fillText(quien, W / 2, 505);
    x.strokeStyle = '#E8620C'; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 430, 535); x.lineTo(W / 2 + 430, 535); x.stroke();
    centro('culminó el repaso de Halloween en Go «La Noche del Gopher» y superó sus tres salas:', 595, F(400, 32), '#3A2A4A');
    // las tres salas
    const bw = 450, gap = 55, x0 = (W - (3 * bw + 2 * gap)) / 2, y0 = 665, bh = 255;
    M.salas.forEach((s, k) => {
      const bx = x0 + k * (bw + gap), col = COLOR[s.color] || '#6B2FA0';
      caja(bx, y0, bw, bh, 22); x.fillStyle = '#FFF1DE'; x.fill(); x.strokeStyle = col; x.lineWidth = 4; x.stroke();
      calabaza(x, bx + bw / 2, y0 - 4, 30);
      x.font = ajusta(s.sala, bw - 40, 700, 30); x.fillStyle = '#4B1D6E'; x.textAlign = 'center'; x.fillText(s.sala, bx + bw / 2, y0 + 92);
      x.font = F(400, 24); x.fillStyle = '#5A4A6A';
      lineas(s.tema, bw - 50).slice(0, 2).forEach((l, j) => x.fillText(l, bx + bw / 2, y0 + 134 + j * 30));
      centro(`${C.aciertos[k]} de ${s.n} al primer intento`, y0 + 222, F(700, 28), col, bx + bw / 2);
    });
    const n = M.salas.reduce((a, s) => a + s.n, 0), ok = C.aciertos.reduce((a, b) => a + b, 0);
    centro(`Resultado: ${ok} de ${n} al primer intento (${Math.round(ok * 100 / n)} %)`, 1000, F(700, 36), '#4B1D6E');
    // pie
    calabaza(x, W / 2 - 70, 1052, 34); fantasma(x, W / 2 + 70, 1050, 1);
    x.font = F(400, 28); x.fillStyle = '#5A4A6A'; x.textAlign = 'left'; x.fillText(`Fecha: ${C.fecha}`, 130, H - 128);
    x.textAlign = 'right'; x.fillText(`Código: ${C.codigo}`, W - 130, H - 128);
    return c;
  }
  function figura(x, d, cx, cy, s, col) {
    x.save(); x.translate(cx - 50 * s, cy - 20 * s); x.scale(s, s); x.fillStyle = col; x.fill(new Path2D(d)); x.restore();
  }
  function fantasma(x, cx, top, s) {
    x.save(); x.translate(cx - 50 * s, top); x.scale(s, s);
    x.fillStyle = '#F4F0FF'; x.strokeStyle = '#4B1D6E'; x.lineWidth = 3; const p = new Path2D(P_FANTASMA); x.fill(p); x.stroke(p);
    x.fillStyle = '#1B1029'; x.beginPath(); x.ellipse(37, 44, 6, 7.5, 0, 0, 7); x.ellipse(63, 44, 6, 7.5, 0, 0, 7); x.fill();
    x.strokeStyle = '#1B1029'; x.lineWidth = 4.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(38, 62); x.quadraticCurveTo(50, 74, 62, 62); x.stroke();
    x.restore();
  }
  function calabaza(x, cx, top, r) {
    x.save(); x.translate(cx, top + r * 1.25);
    x.strokeStyle = '#3D7A1E'; x.lineWidth = r * .2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, -r * .85); x.quadraticCurveTo(r * .05, -r * 1.3, r * .4, -r * 1.35); x.stroke();
    [[-r * .45, '#E8620C'], [r * .45, '#E8620C'], [0, '#FF7A18']].forEach(([dx, col]) => {
      x.fillStyle = col; x.beginPath(); x.ellipse(dx, 0, r * .55, r * .95, 0, 0, Math.PI * 2); x.fill();
    });
    x.fillStyle = '#3B1D00'; x.beginPath();
    x.moveTo(-r * .5, -r * .1); x.lineTo(-r * .3, -r * .42); x.lineTo(-r * .1, -r * .1);
    x.moveTo(r * .1, -r * .1); x.lineTo(r * .3, -r * .42); x.lineTo(r * .5, -r * .1);
    x.moveTo(-r * .55, r * .25); x.quadraticCurveTo(0, r * .75, r * .55, r * .25); x.quadraticCurveTo(0, r * .5, -r * .55, r * .25);
    x.fill(); x.restore();
  }
  function telarana(x, cx, cy, sx) {
    x.save(); x.translate(cx, cy); x.scale(sx, 1); x.strokeStyle = '#B9AFC9'; x.lineWidth = 1.6;
    const ang = [0, .3, .6, .9, 1.2, Math.PI / 2];
    ang.forEach(a => { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 190, Math.sin(a) * 190); x.stroke(); });
    [45, 90, 140, 185].forEach(r => {
      x.beginPath();
      ang.forEach((a, k) => { const px = Math.cos(a) * r, py = Math.sin(a) * r; if (!k) x.moveTo(px, py); else { const m = (a + ang[k - 1]) / 2; x.quadraticCurveTo(Math.cos(m) * r * .82, Math.sin(m) * r * .82, px, py); } });
      x.stroke();
    });
    x.restore();
  }
  /* PDF de una página A4 horizontal con la imagen del certificado, armado en el navegador (sin servidor) */
  function pdfBlob(c) {
    const jpg = Uint8Array.from(atob(c.toDataURL('image/jpeg', .93).split(',')[1]), ch => ch.charCodeAt(0));
    const te = new TextEncoder(), partes = [], offs = [];
    let largo = 0;
    const add = s => { const b = typeof s === 'string' ? te.encode(s) : s; partes.push(b); largo += b.length; };
    const obj = (n, cuerpo) => { offs[n] = largo; add(`${n} 0 obj\n${cuerpo}\nendobj\n`); };
    const dib = 'q 841.89 0 0 595.28 0 0 cm /Im0 Do Q';
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offs[4] = largo;
    add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
    add(jpg); add('\nendstream\nendobj\n');
    obj(5, `<< /Length ${dib.length} >>\nstream\n${dib}\nendstream`);
    obj(6, '<< /Title (Certificado - La Noche del Gopher) /Producer (La Noche del Gopher) >>');
    const xref = largo;
    add('xref\n0 7\n0000000000 65535 f \n' + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
    add(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(partes, { type: 'application/pdf' });
  }

  /* ---------------- inicio ---------------- */
  async function iniciar() {
    try { M = await Cifra.abrir(await Cifra.llave(D.sal, 'meta'), D.meta); }
    catch { app.innerHTML = '<p class="cargando">No se pudo abrir el juego en este navegador. Use Chrome, Edge, Firefox o Safari actualizados.</p>'; return; }
    vigilar();
    const antes = JSON.parse(sessionStorage.getItem(MARCA) || 'null');
    if (antes) { E = cargar(antes.nombre, antes.apellido); marcar(null); }
    portada();
    if (antes) bloqueo(antes.sala);                           // recargó o salió con el juego en curso
  }
  window.__rp = {                                             // para la prueba automática: no expone respuestas
    estado: () => ({ enCurso: E.enCurso, salas: E.salas.map(r => r && r.aciertos) }),
    pregunta: () => S && S.pub && { t: S.t, i: S.i, tipo: S.pub.tipo, orden: S.orden.map(o => o.id), resuelta: S.resuelta },
    ocupado: () => ocupado,
    pdf: () => { const c = lienzo(cert); return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(pdfBlob(c)); }); },
  };
  iniciar();
})();
