const SB_URL = 'https://ocwzwrapiqvyxdlijdoc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3p3cmFwaXF2eXhkbGlqZG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzA1NzgsImV4cCI6MjA5ODUwNjU3OH0._3r9pDu7Vg09o_5MZt3tcu7i2CZoWk3xKtbOMWcY_wM';
const SESSION_KEY = 'hp_cursos_session';

let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
let recoverySession = null;

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function guardarSesion(data) {
  if (data && data.expires_in && !data.expires_at) data.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
  session = data;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/* El access_token de Supabase expira (por default en 1h) — si ya venció o está por vencer,
   lo renovamos con el refresh_token antes de usarlo, para que una sesión abierta desde hace
   rato no truene al cargar cursos o comprar. */
async function ensureFreshSession() {
  if (!session || !session.refresh_token || !session.expires_at) return;
  if (Math.floor(Date.now() / 1000) < session.expires_at - 60) return;
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const data = await r.json();
    if (r.ok && data.access_token) { guardarSesion(data); return; }
    cerrarSesion();
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  } catch (e) {
    if (e.message === 'Tu sesión expiró. Vuelve a iniciar sesión.') throw e;
    /* error de red al renovar: dejamos pasar, la llamada siguiente fallará con su propio error */
  }
}

function cerrarSesion() {
  session = null;
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('cursosCatalogo').style.display = 'none';
  document.getElementById('cursosAuth').style.display = 'flex';
}

/* ── Tabs iniciar sesión / crear cuenta ── */
function mostrarTabAuth(tab) {
  document.getElementById('tabLogin').classList.toggle('on', tab === 'login');
  document.getElementById('tabRegistro').classList.toggle('on', tab === 'registro');
  document.getElementById('panelLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panelRegistro').style.display = tab === 'registro' ? 'block' : 'none';
  document.getElementById('cursosAuthSub').textContent = tab === 'login'
    ? 'Inicia sesión para ver el catálogo'
    : 'Crea tu cuenta para ver el catálogo';
}

/* ── Iniciar sesión ── */
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginErr');
  const btn = document.getElementById('loginBtn');
  err.style.display = 'none';
  if (!email || !pass) { err.textContent = 'Ingresa tu correo y contraseña.'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error_code === 'email_not_confirmed'
        ? 'Debes confirmar tu correo primero (revisa tu bandeja de entrada).'
        : (data.msg || data.error_description || 'Correo o contraseña incorrectos.');
      throw new Error(msg);
    }
    guardarSesion(data);
    mostrarApp();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  }
}

/* ── Crear cuenta ── */
async function doRegistro() {
  const nombre = document.getElementById('regNombre').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err = document.getElementById('regErr');
  const ok = document.getElementById('regOk');
  const btn = document.getElementById('regBtn');
  err.style.display = 'none'; ok.style.display = 'none';

  if (!nombre || !email || !pass) { err.textContent = 'Completa nombre, correo y contraseña.'; err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; err.style.display = 'block'; return; }
  if (pass !== pass2) { err.textContent = 'Las contraseñas no coinciden.'; err.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Creando cuenta…';
  try {
    const r = await fetch(SB_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, data: { nombre } })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.msg || data.error_description || data.error || 'No se pudo crear la cuenta.');

    if (data.access_token) {
      guardarSesion(data);
      mostrarApp();
    } else {
      ok.textContent = 'Cuenta creada ✔ Revisa tu correo para confirmarla y luego inicia sesión.';
      ok.style.display = 'block';
      document.getElementById('regNombre').value = '';
      document.getElementById('regPass').value = '';
      document.getElementById('regPass2').value = '';
      mostrarTabAuth('login');
      document.getElementById('loginEmail').value = email;
    }
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}

/* ── Olvidé mi contraseña ── */
async function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  const err = document.getElementById('loginErr');
  if (!email) { err.textContent = 'Escribe tu correo arriba primero.'; err.style.display = 'block'; return; }
  try {
    const r = await fetch(SB_URL + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, options: { redirect_to: window.location.href.split('#')[0] } })
    });
    if (!r.ok) throw new Error((await r.json()).msg || 'No se pudo enviar el correo.');
    err.style.display = 'none';
    alert('Te enviamos un correo con un enlace para elegir una nueva contraseña ✔');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

/* ── Enlace de recuperación (vuelve del correo) ── */
function checkRecoveryLink() {
  const hash = window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.slice(1));

  if (params.get('error_code') === 'otp_expired') {
    history.replaceState(null, '', window.location.pathname);
    document.getElementById('loginErr').textContent = 'Ese enlace ya venció. Pide uno nuevo con "¿Olvidaste tu contraseña?" y ábrelo apenas te llegue.';
    document.getElementById('loginErr').style.display = 'block';
    return false;
  }

  const access_token = params.get('access_token');
  if (params.get('type') !== 'recovery' || !access_token) return false;
  recoverySession = { access_token };
  document.getElementById('cursosAuth').style.display = 'none';
  document.getElementById('cursosCatalogo').style.display = 'none';
  document.getElementById('cursosReset').style.display = 'flex';
  return true;
}

async function confirmarReset() {
  const nueva = document.getElementById('resetPass').value;
  const err = document.getElementById('resetErr');
  err.style.display = 'none';
  if (!nueva || nueva.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; err.style.display = 'block'; return; }
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + recoverySession.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva })
    });
    if (!r.ok) throw new Error((await r.json()).msg || 'No se pudo actualizar la contraseña.');
    guardarSesion(recoverySession);
    history.replaceState(null, '', window.location.pathname);
    mostrarApp();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

/* ── Catálogo ── */
async function get(path, extraHeaders) {
  await ensureFreshSession();
  const r = await fetch(SB_URL + '/rest/v1/' + path, {
    headers: Object.assign({ 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session ? session.access_token : SB_KEY) }, extraHeaders || {})
  });
  if (!r.ok) throw new Error('No se pudo cargar ' + path);
  return r.json();
}

function estadoCurso(curso, inscripciones) {
  const propias = inscripciones.filter(i => i.curso_id === curso.id);
  if (propias.some(i => i.estatus === 'pagado')) return 'pagado';
  // Solo cuenta como "pendiente" si Mercado Pago ya registró un intento de pago real
  // (mp_payment_id presente, ej. pago en OXXO esperando depósito). Si el cliente nunca
  // completó nada en Mercado Pago, no debe quedar atorado — puede intentar comprar de nuevo.
  if (propias.some(i => i.estatus === 'pendiente' && i.mp_payment_id)) return 'pendiente';
  return 'ninguno';
}

function renderCursos(cursos, inscripciones) {
  const grid = document.getElementById('cursoGrid');
  if (!cursos.length) {
    grid.innerHTML = '<div class="cursos-empty-msg">Muy pronto publicaremos los cursos disponibles.</div>';
    return;
  }
  grid.innerHTML = cursos.map(c => {
    const estado = estadoCurso(c, inscripciones);
    let boton;
    if (estado === 'pagado') {
      boton = '<button type="button" class="curso-card-btn is-ok" disabled>✅ Acceso activo</button><div class="curso-card-note">Muy pronto subimos las lecciones aquí</div>';
    } else if (estado === 'pendiente') {
      boton = '<button type="button" class="curso-card-btn" disabled>⏳ Confirmando tu pago…</button>';
    } else {
      boton = `<button type="button" class="curso-card-btn" onclick="comprarCurso(${c.id}, this)">Comprar — ${fmtMoney(c.precio)}</button>`;
    }
    return `
      <div class="curso-card">
        <div class="curso-card-head">${escapeHtml(c.nombre)}</div>
        <div class="curso-card-body">
          <div class="curso-card-desc">${escapeHtml(c.descripcion || '')}</div>
          <div class="curso-card-price">${fmtMoney(c.precio)}</div>
          ${boton}
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function cargarCursos() {
  const grid = document.getElementById('cursoGrid');
  grid.innerHTML = '<div class="cursos-empty-msg">Cargando cursos…</div>';
  try {
    const [cursos, inscripciones] = await Promise.all([
      get('cursos?select=*&activo=eq.true&order=orden'),
      get(`inscripciones?select=*&user_id=eq.${session.user.id}`)
    ]);
    renderCursos(cursos, inscripciones);
  } catch (e) {
    grid.innerHTML = '<div class="cursos-empty-msg">No se pudieron cargar los cursos en este momento. Intenta de nuevo más tarde.</div>';
  }
}

/* ── Comprar (Mercado Pago) ── */
async function comprarCurso(cursoId, btn) {
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Preparando pago…';
  try {
    await ensureFreshSession();
    const r = await fetch('/api/mp-crear-preferencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ curso_id: cursoId })
    });
    const data = await r.json();
    if (!r.ok || !data.init_point) throw new Error(data.error || 'No se pudo iniciar el pago.');
    window.location.href = data.init_point;
  } catch (e) {
    alert('Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

function mostrarBannerRetorno() {
  const params = new URLSearchParams(window.location.search);
  const compra = params.get('compra');
  if (!compra) return;
  const banner = document.getElementById('cursosBanner');
  const mensajes = {
    approved: ['ok', '✅ ¡Pago recibido! En unos segundos verás tu acceso activo.'],
    pending: ['wait', '⏳ Tu pago está en proceso (por ejemplo, si pagaste en OXXO). Te avisaremos cuando se confirme.'],
    failure: ['err', '❌ No se pudo completar el pago. Puedes intentarlo de nuevo cuando quieras.']
  };
  const [clase, texto] = mensajes[compra] || [null, null];
  if (texto) {
    banner.className = 'cursos-banner ' + clase;
    banner.textContent = texto;
    banner.style.display = 'block';
  }
  history.replaceState(null, '', window.location.pathname);
}

/* ── Mostrar la app tras iniciar sesión ── */
function mostrarApp() {
  document.getElementById('cursosAuth').style.display = 'none';
  document.getElementById('cursosReset').style.display = 'none';
  document.getElementById('cursosCatalogo').style.display = 'block';
  const nombre = (session.user && session.user.user_metadata && session.user.user_metadata.nombre) || '';
  document.getElementById('cursosSaludo').textContent = nombre ? `¡Hola, ${nombre}! Elige el curso con el que quieres empezar` : 'Elige el curso con el que quieres empezar';
  mostrarBannerRetorno();
  cargarCursos();
}

/* ── Arranque ── */
if (!checkRecoveryLink()) {
  if (session && session.access_token) {
    mostrarApp();
  } else {
    document.getElementById('cursosAuth').style.display = 'flex';
  }
}
