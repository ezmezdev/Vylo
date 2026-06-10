// ============================================================
// ADMIN PANEL · LÓGICA
// ============================================================

console.log('[Admin] Script cargando...');

if (!window.APP_CONFIG) {
  console.error('[Admin] ERROR: config.js no cargó. APP_CONFIG no definido.');
}
if (!window.supabase) {
  console.error('[Admin] ERROR: supabase-js no cargó.');
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET } = window.APP_CONFIG;
console.log('[Admin] Conectando a Supabase:', SUPABASE_URL);
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('[Admin] Cliente Supabase creado OK');

// ============================================================
// FONT PICKER — selector de tipografías con preview visual
// ============================================================
const HEADING_FONTS = [
  'Cormorant Garamond','Playfair Display','DM Serif Display',
  'Bodoni Moda','Italiana','Cinzel','Marcellus',
  'Great Vibes','Dancing Script','Allura','Pinyon Script',
  'Libre Baskerville','Lora','Merriweather',
];
const BODY_FONTS = [
  'Manrope','Inter','Lato','Montserrat','Nunito Sans',
  'Karla','Work Sans','Poppins','Raleway','Open Sans',
];
const FONT_SAMPLES = { heading: 'Aa Bb', body: 'Texto de ejemplo' };
const loadedFonts = new Set();

function loadGoogleFont(fontName) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g,'+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// ── Un único listener global para cerrar pickers ──
document.addEventListener('click', e => {
  document.querySelectorAll('.font-picker').forEach(p => {
    if (!p.contains(e.target)) {
      p.querySelector('.font-picker__list').hidden = true;
      p.querySelector('.font-picker__trigger').classList.remove('is-open');
    }
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.font-picker').forEach(p => {
      p.querySelector('.font-picker__list').hidden = true;
      p.querySelector('.font-picker__trigger').classList.remove('is-open');
    });
  }
});

function buildFontPickerList(picker) {
  const type = picker.dataset.type || 'heading';
  const allowInherit = picker.dataset.allowInherit === 'true';
  const fonts = type === 'body' ? BODY_FONTS : HEADING_FONTS;
  const input = picker.querySelector('input[type="hidden"]');
  const list = picker.querySelector('.font-picker__list');

  list.innerHTML = '';

  if (allowInherit) {
    const li = document.createElement('li');
    li.className = 'font-picker__option font-picker__option--inherit';
    li.dataset.font = '';
    li.innerHTML = `<span class="font-picker__option-name" style="font-style:italic">Heredar del tema</span>
      <span class="font-picker__option-sample" style="font-style:italic;color:var(--muted)">— global —</span>`;
    if (input.value === '') li.classList.add('is-selected');
    list.appendChild(li);
  }

  fonts.forEach(font => {
    loadGoogleFont(font);
    const li = document.createElement('li');
    li.className = 'font-picker__option';
    li.dataset.font = font;
    li.innerHTML = `<span class="font-picker__option-name">${font}</span>
      <span class="font-picker__option-sample" style="font-family:'${font}',serif">${FONT_SAMPLES[type] || 'Aa'}</span>`;
    if (font === input.value) li.classList.add('is-selected');
    list.appendChild(li);
  });

  // Click en opción — delegado en la lista
  list.addEventListener('click', e => {
    const li = e.target.closest('.font-picker__option');
    if (!li) return;
    applyFontPickerValue(picker, li.dataset.font);
    list.hidden = true;
    picker.querySelector('.font-picker__trigger').classList.remove('is-open');
  });
}

function applyFontPickerValue(picker, font) {
  const input = picker.querySelector('input[type="hidden"]');
  const preview = picker.querySelector('.font-picker__preview');
  input.value = font || '';
  if (font) {
    preview.textContent = font;
    preview.style.fontFamily = `'${font}', serif`;
    preview.style.fontStyle = '';
    preview.style.color = '';
  } else {
    preview.textContent = '— Heredar del tema —';
    preview.style.fontFamily = '';
    preview.style.fontStyle = 'italic';
    preview.style.color = 'var(--muted)';
  }
  picker.querySelectorAll('.font-picker__option').forEach(opt => {
    opt.classList.toggle('is-selected', (opt.dataset.font || '') === (font || ''));
  });
}

function initFontPickers(container = document) {
  container.querySelectorAll('.font-picker').forEach(picker => {
    if (picker.dataset.initialized) return;
    picker.dataset.initialized = 'true';

    const input = picker.querySelector('input[type="hidden"]');
    const trigger = picker.querySelector('.font-picker__trigger');
    const list = picker.querySelector('.font-picker__list');

    // Construir lista inmediatamente
    buildFontPickerList(picker);

    // Aplicar valor actual al trigger
    applyFontPickerValue(picker, input.value || '');

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      // Cerrar otros pickers abiertos
      document.querySelectorAll('.font-picker').forEach(p => {
        if (p !== picker) {
          p.querySelector('.font-picker__list').hidden = true;
          p.querySelector('.font-picker__trigger').classList.remove('is-open');
        }
      });
      const isOpen = !list.hidden;
      list.hidden = isOpen;
      trigger.classList.toggle('is-open', !isOpen);
      if (!isOpen) {
        const selected = list.querySelector('.is-selected');
        if (selected) setTimeout(() => selected.scrollIntoView({ block: 'nearest' }), 10);
      }
    });
  });
}

function setFontPickerValue(container, fieldName, fontValue) {
  const picker = container.querySelector(`.font-picker[data-name="${fieldName}"]`);
  if (!picker) return;
  const input = picker.querySelector('input[type="hidden"]');
  if (input) input.value = fontValue || '';
  // Reconstruir lista con el nuevo valor seleccionado
  buildFontPickerList(picker);
  applyFontPickerValue(picker, fontValue || '');
}

// ============================================================
// MODO OSCURO — persiste en localStorage
// ============================================================

// Inicializar modo oscuro
initDarkMode();

// Toggle modo oscuro
document.getElementById('dark-mode-btn').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyThemeMode(current === 'dark' ? 'light' : 'dark');
});

// Estado global
const state = {
  user: null,
  invitations: [],
  currentInvitation: null,
  currentSections: [],
  currentGallery: [],
  editingSection: null
};

// ---- Utilidades ----
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function toast(msg, type = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast is-${type}`;
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 3000);
}

// ============================================================
// COMPRESIÓN DE IMÁGENES (WebP, antes de subir a Supabase)
// ============================================================
// Estrategia:
//   - Fondo de sección: máx 1920px ancho, calidad 0.82 WebP
//   - Galería:          máx 1600px ancho, calidad 0.80 WebP
//   - Columna (info/regalo): máx 1200px ancho, calidad 0.78 WebP
// Resultado típico: JPG 3MB → WebP ~200-400KB sin pérdida visual perceptible

async function compressImage(file, { maxW = 1920, maxH = 1920, quality = 0.82 } = {}) {
  // Si el navegador no soporta canvas o ya es WebP pequeño, devolver tal cual
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Escalar manteniendo proporción si supera el máximo
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Fondo blanco para imágenes PNG con transparencia
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Intentar WebP primero, fallback a JPEG
      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';

      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        // Solo usar comprimido si es más pequeño que el original
        const compressed = blob.size < file.size ? blob : file;
        const ext = supportsWebP ? 'webp' : 'jpg';
        const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
        resolve(new File([compressed], name, { type: mimeType }));
      }, mimeType, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function storageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** Convierte ISO → valor para input datetime-local */
function isoToLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function localToIso(local) {
  if (!local) return null;
  return new Date(local).toISOString();
}

// ============================================================
// MODO OSCURO — persiste en localStorage
// ============================================================
function initDarkMode() {
  const saved = localStorage.getItem('vylo-theme') || 'light';
  applyThemeMode(saved);
}

function applyThemeMode(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('vylo-theme', mode);
  const btn = document.getElementById('dark-mode-btn');
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  if (!btn) return;
  if (mode === 'dark') {
    btn.setAttribute('aria-label', 'Cambiar a modo claro');
    btn.title = 'Modo claro';
    sun.hidden = false;
    moon.hidden = true;
  } else {
    btn.setAttribute('aria-label', 'Cambiar a modo oscuro');
    btn.title = 'Modo oscuro';
    sun.hidden = true;
    moon.hidden = false;
  }
}

// Aplicar antes del DOM para evitar flash
(function() {
  const saved = localStorage.getItem('vylo-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', function() {
console.log('[Admin] DOM listo, iniciando...');

// Inicializar font-pickers
initFontPickers();

// Inicializar modo oscuro
initDarkMode();

function showLogin() {
  console.log('[Admin] Mostrando login');
  document.getElementById('auth-view').removeAttribute('hidden');
  document.getElementById('admin-view').setAttribute('hidden', '');
}

function showAdmin() {
  console.log('[Admin] Mostrando panel...');
  document.getElementById('auth-view').setAttribute('hidden', '');
  document.getElementById('admin-view').removeAttribute('hidden');
  document.getElementById('user-email').textContent = state.user.email;
  loadInvitations();
}

async function checkAuth() {
  console.log('[Admin] Verificando sesión...');
  try {
    const { data: { session } } = await sb.auth.getSession();
    console.log('[Admin] Sesión:', session ? 'activa' : 'ninguna');
    if (session) {
      state.user = session.user;
      showAdmin();
    } else {
      showLogin();
    }
  } catch(e) {
    console.error('[Admin] Error en checkAuth:', e);
    showLogin();
  }
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email');
  const password = fd.get('password');
  console.log('[Admin] Intentando login con:', email);

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  console.log('[Admin] Respuesta login:', { data, error });

  if (error) {
    console.error('[Admin] Error de login:', error.message, error);
    $('#auth-error').textContent = `Error: ${error.message}`;
    return;
  }
  state.user = data.user;
  console.log('[Admin] Login exitoso:', state.user.email);
  showAdmin();
});

$('#logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  state.user = null;
  showLogin();
});

// Mostrar / ocultar contraseña
$('#toggle-password').addEventListener('click', () => {
  const input = $('#password-input');
  const btn = $('#toggle-password');
  const showing = input.type === 'text';

  input.type = showing ? 'password' : 'text';
  btn.setAttribute('aria-pressed', String(!showing));
  btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  $('#icon-eye').style.display = showing ? 'block' : 'none';
  $('#icon-eye-off').style.display = showing ? 'none' : 'block';
});

function showAdmin() {
  console.log('[Admin] Mostrando panel...');
  $('#auth-view').hidden = true;
  $('#admin-view').hidden = false;
  $('#user-email').textContent = state.user.email;
  loadInvitations();
}

// ============================================================
// LISTA DE INVITACIONES
// ============================================================
async function loadInvitations() {
  console.log('[Admin] Cargando invitaciones...');
  try {
    const { data, error } = await sb
      .from('invitations')
      .select('id, slug, event_title, host_names, event_date, is_published')
      .order('created_at', { ascending: false });

    console.log('[Admin] Invitaciones resultado:', { data, error });
    if (error) {
      console.error('[Admin] Error cargando invitaciones:', error);
      toast('Error: ' + error.message, 'error');
      return;
    }
    state.invitations = data || [];
    renderInvitationList();
  } catch(e) {
    console.error('[Admin] Excepción en loadInvitations:', e);
    toast('Error inesperado: ' + e.message, 'error');
  }
}

function renderInvitationList() {
  const ul = $('#invitation-list');
  ul.innerHTML = '';
  state.invitations.forEach(inv => {
    const li = document.createElement('li');
    li.className = 'invitation-item';
    if (state.currentInvitation?.id === inv.id) li.classList.add('is-active');
    li.innerHTML = `
      <div>
        <div class="invitation-item__main">${escapeHtml(inv.host_names)}</div>
        <div class="invitation-item__sub">${escapeHtml(inv.event_title)} · ${new Date(inv.event_date).toLocaleDateString('es-ES')}</div>
      </div>
      <span class="invitation-item__status ${inv.is_published ? 'is-published' : ''}">
        ${inv.is_published ? 'Pub' : 'Borr'}
      </span>
    `;
    li.addEventListener('click', () => selectInvitation(inv.id));
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ============================================================
// CREAR / SELECCIONAR INVITACIÓN
// ============================================================
$('#new-invitation-btn').addEventListener('click', async () => {
  const raw = prompt('Slug para la nueva invitación (ej: boda-ana-luis):');
  if (raw === null) return; // canceló

  // Limpiar automáticamente: minúsculas, reemplazar espacios y caracteres inválidos por guión
  const slug = raw.trim().toLowerCase()
    .replace(/\s+/g, '-')           // espacios → guión
    .replace(/[^a-z0-9-]/g, '-')   // caracteres inválidos → guión
    .replace(/-+/g, '-')            // guiones múltiples → uno solo
    .replace(/^-|-$/g, '');         // quitar guiones al inicio/fin

  if (!slug) {
    toast('El slug no puede estar vacío', 'error'); return;
  }

  console.log('[Admin] Creando invitación con slug:', slug);
  const { data, error } = await sb
    .from('invitations')
    .insert({
      slug,
      event_type: 'boda',
      host_names: 'Anfitriones',
      event_title: 'Nuevo Evento',
      event_date: new Date(Date.now() + 90 * 86400000).toISOString()
    })
    .select()
    .single();
  if (error) { toast(error.message, 'error'); return; }

  // Crear las 5 secciones por defecto
  const defaultSections = [
    { section_type: 'hero',      position: 0, content: { subtitle: '', quote: '' } },
    { section_type: 'countdown', position: 1, content: { title: 'Cuenta regresiva', subtitle: '' } },
    { section_type: 'rsvp',      position: 2, content: { title: 'Confirma tu asistencia', subtitle: '', button_text: 'Confirmar' } },
    { section_type: 'calendar',  position: 3, content: { title: 'Guarda la fecha', subtitle: '', button_text: 'Agregar al calendario', duration_hours: 4 } },
    { section_type: 'gallery',   position: 4, content: { title: 'Galería', subtitle: '' } }
  ].map(s => ({ ...s, invitation_id: data.id }));

  await sb.from('sections').insert(defaultSections);
  await loadInvitations();
  selectInvitation(data.id);
  toast('Invitación creada');
});

async function selectInvitation(id) {
  $('#empty-state').hidden = true;
  $('#editor').hidden = false;

  const [invRes, secRes, galRes] = await Promise.all([
    sb.from('invitations').select('*').eq('id', id).single(),
    sb.from('sections').select('*').eq('invitation_id', id).order('position'),
    sb.from('gallery_images').select('*').eq('invitation_id', id).order('position')
  ]);

  state.currentInvitation = invRes.data;
  state.currentSections = secRes.data || [];
  state.currentGallery = galRes.data || [];

  renderInvitationList();
  fillGeneralForm();
  fillThemeForm();
  renderSectionsList();
  renderGalleryList();
  loadLinks();
  updateEditorHeader();
}

function updateEditorHeader() {
  const inv = state.currentInvitation;
  $('#editor-title').textContent = `${inv.host_names} · ${inv.event_title}`;
  $('#publish-btn').textContent = inv.is_published ? 'Despublicar' : 'Publicar';
  $('#preview-link').href = `../public/?i=${inv.slug}`;
}

// ============================================================
// TABS
// ============================================================
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('is-active'));
    $$('.tab-panel').forEach(p => { p.classList.remove('is-active'); p.hidden = true; });
    tab.classList.add('is-active');
    const panel = $(`#tab-${tab.dataset.tab}`);
    panel.classList.add('is-active');
    panel.hidden = false;
  });
});

// ============================================================
// FORMULARIO GENERAL
// ============================================================
function fillGeneralForm() {
  const inv = state.currentInvitation;
  const f = $('#form-general');
  f.slug.value = inv.slug;
  f.event_type.value = inv.event_type;
  f.host_names.value = inv.host_names;
  f.event_title.value = inv.event_title;
  f.event_date.value = isoToLocal(inv.event_date);
  f.countdown_target.value = isoToLocal(inv.countdown_target);
  f.rsvp_form_url.value = inv.rsvp_form_url || '';
  f.calendar_location.value = inv.calendar_location || '';
  f.calendar_description.value = inv.calendar_description || '';
}

$('#form-general').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f);

  const update = {
    slug: fd.get('slug'),
    event_type: fd.get('event_type'),
    host_names: fd.get('host_names'),
    event_title: fd.get('event_title'),
    event_date: localToIso(fd.get('event_date')),
    countdown_target: localToIso(fd.get('countdown_target')) || localToIso(fd.get('event_date')),
    rsvp_form_url: fd.get('rsvp_form_url') || null,
    calendar_location: fd.get('calendar_location') || null,
    calendar_description: fd.get('calendar_description') || null
  };

  const { error } = await sb.from('invitations')
    .update(update).eq('id', state.currentInvitation.id);
  if (error) { toast(error.message, 'error'); return; }

  toast('Cambios guardados');
  await selectInvitation(state.currentInvitation.id);
  await loadInvitations();
});

// ============================================================
// FORMULARIO TEMA
// ============================================================
function fillThemeForm() {
  const inv = state.currentInvitation;
  const f = $('#form-theme');
  f.primary_color.value = inv.primary_color;
  f.background_color.value = inv.background_color;
  f.accent_color.value = inv.accent_color;
  f.base_font_size.value = inv.base_font_size;
  // Font pickers
  setFontPickerValue(f, 'heading_font', inv.heading_font);
  setFontPickerValue(f, 'body_font', inv.body_font);
}

$('#form-theme').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const update = {
    primary_color: fd.get('primary_color'),
    background_color: fd.get('background_color'),
    accent_color: fd.get('accent_color'),
    heading_font: fd.get('heading_font'),
    body_font: fd.get('body_font'),
    base_font_size: Number(fd.get('base_font_size'))
  };
  const { error } = await sb.from('invitations')
    .update(update).eq('id', state.currentInvitation.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Tema actualizado');
  state.currentInvitation = { ...state.currentInvitation, ...update };
});

// ============================================================
// SECCIONES (lista, drag-and-drop, toggle, edición)
// ============================================================
function renderSectionsList() {
  const ul = $('#sections-list');
  ul.innerHTML = '';

  state.currentSections.forEach((section, i) => {
    const li = document.createElement('li');
    li.className = `section-item ${section.is_enabled ? '' : 'is-disabled'}`;
    li.draggable = true;
    li.dataset.id = section.id;
    li.innerHTML = `
      <span class="section-item__drag" aria-hidden="true">⋮⋮</span>
      <div class="section-item__info">
        <div class="section-item__type">${sectionLabel(section.section_type)}</div>
        <div class="section-item__meta">Posición ${i + 1} · ${section.is_enabled ? 'Habilitada' : 'Deshabilitada'}</div>
      </div>
      <div class="section-item__actions">
        <button type="button" class="toggle ${section.is_enabled ? 'is-on' : ''}"
                aria-label="${section.is_enabled ? 'Deshabilitar' : 'Habilitar'} sección"
                data-action="toggle"></button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="edit">Editar</button>
        <button type="button" class="btn btn--danger btn--sm" data-action="delete">Eliminar</button>
      </div>
    `;

    li.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleSection(section));
    li.querySelector('[data-action="edit"]').addEventListener('click', () => openSectionModal(section));
    li.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSection(section));

    // Drag and drop
    li.addEventListener('dragstart', e => {
      li.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', section.id);
    });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
    li.addEventListener('dragover', e => { e.preventDefault(); });
    li.addEventListener('drop', e => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      reorderSections(draggedId, section.id);
    });

    ul.appendChild(li);
  });
}

function sectionLabel(type) {
  return ({
    hero:      'Portada (Hero)',
    countdown: 'Contador regresivo',
    rsvp:      'Confirmación (RSVP)',
    calendar:  'Calendario',
    gallery:   'Galería',
    location:  'Ubicación',
    info:      'Info (columnas)',
    gift:      'Regalo / Alias',
    footer:    'Footer (pie de página)',
  })[type] || type;
}

async function toggleSection(section) {
  const { error } = await sb.from('sections')
    .update({ is_enabled: !section.is_enabled })
    .eq('id', section.id);
  if (error) { toast(error.message, 'error'); return; }
  section.is_enabled = !section.is_enabled;
  renderSectionsList();
}

async function deleteSection(section) {
  if (!confirm(`¿Eliminar la sección "${sectionLabel(section.section_type)}"?`)) return;
  const { error } = await sb.from('sections').delete().eq('id', section.id);
  if (error) { toast(error.message, 'error'); return; }
  state.currentSections = state.currentSections.filter(s => s.id !== section.id);
  renderSectionsList();
  toast('Sección eliminada');
}

async function reorderSections(draggedId, targetId) {
  const list = [...state.currentSections];
  const fromIdx = list.findIndex(s => s.id === draggedId);
  const toIdx = list.findIndex(s => s.id === targetId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

  const [moved] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, moved);

  // Reasignar posiciones
  const updates = list.map((s, i) => ({ id: s.id, position: i }));
  for (const u of updates) {
    await sb.from('sections').update({ position: u.position }).eq('id', u.id);
  }
  state.currentSections = list.map((s, i) => ({ ...s, position: i }));
  renderSectionsList();
}

// ---- Agregar sección ----
$$('.add-section__options button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const type = btn.dataset.add;
    const position = state.currentSections.length;
    const { data, error } = await sb.from('sections')
      .insert({
        invitation_id: state.currentInvitation.id,
        section_type: type,
        position,
        content: defaultContentFor(type)
      })
      .select()
      .single();
    if (error) { toast(error.message, 'error'); return; }
    state.currentSections.push(data);
    renderSectionsList();
    toast('Sección agregada');
  });
});

function defaultContentFor(type) {
  return ({
    hero:      { subtitle: '', quote: '' },
    countdown: { title: 'Cuenta regresiva', subtitle: '' },
    rsvp:      { title: 'Confirma tu asistencia', subtitle: '', button_text: 'Confirmar' },
    calendar:  { title: 'Guarda la fecha', subtitle: '', button_text: 'Agregar al calendario', duration_hours: 4 },
    gallery:   { title: 'Galería', subtitle: '' },
    location:  { eyebrow: '¿Dónde?', title: '', address: '', map_height: 380, map_height_mobile: 260 },
    footer:    { tagline: 'Invitación digital', show_hosts: true, show_event: true, show_date: false, show_logo: true },
    info:      { title: '', subtitle: '', columns: [] },
    gift:      { title: 'Regalo', subtitle: '', columns: [] }
  })[type] || {};
}

// ---- Modal de edición de sección ----
function openSectionModal(section) {
  state.editingSection = section;
  const modal = { _clearBg: false, _bgFile: null };
  const drawer = document.getElementById('section-drawer');
  const f = document.getElementById('section-drawer-form');

  document.getElementById('section-modal-title').textContent = `Editar: ${sectionLabel(section.section_type)}`;
  f.is_enabled.checked = section.is_enabled;
  // Color pickers: usar valor guardado o blanco como fallback (no negro)
  f.background_color.value = section.background_color || '#ffffff';
  f.text_color.value = section.text_color || '#1a1a1a';
  // Resetear y reinicializar font-pickers del modal
  drawer.querySelectorAll('.font-picker').forEach(p => {
    delete p.dataset.initialized;
  });
  setFontPickerValue(drawer, 'heading_font', section.heading_font || '');
  setFontPickerValue(drawer, 'body_font', section.body_font || '');
  initFontPickers(drawer);
  f.font_size.value = section.font_size || '';
  f.padding_y.value = section.padding_y ?? 80;

  // Inicializar campo de transición
  f.bottom_transition.value = section.bottom_transition || 'none';
  f.top_transition.value = section.top_transition || 'none';
  f.motion_effect.value = section.motion_effect || 'none';

  // Partículas
  const particleSelect = f.particle_effect;
  const particleWrap = document.getElementById('particle-intensity-wrap');
  const particleIntensityInput = f.particle_intensity;
  const particleIntensityVal = document.getElementById('particle-intensity-val');

  particleSelect.value = section.particle_effect || 'none';
  particleIntensityInput.value = section.particle_intensity || 50;
  particleIntensityVal.textContent = particleIntensityInput.value;
  particleWrap.hidden = particleSelect.value === 'none';

  particleSelect.addEventListener('change', () => {
    particleWrap.hidden = particleSelect.value === 'none';
  });
  particleIntensityInput.addEventListener('input', () => {
    particleIntensityVal.textContent = particleIntensityInput.value;
  });

  // Campos de contenido según el tipo
  const fieldsEl = $('#section-content-fields');
  fieldsEl.innerHTML = '';
  contentFieldsFor(section.section_type).forEach(field => {
    const label = document.createElement('label');
    label.className = field.type === 'checkbox' ? 'checkbox full' : (field.full ? 'full' : '');

    if (field.type === 'checkbox') {
      const checked = section.content?.[field.key] === true || section.content?.[field.key] === 'true';
      label.innerHTML = `
        <input type="checkbox" name="content_${field.key}" ${checked ? 'checked' : ''} />
        <span>${field.label}</span>
      `;
    } else if (field.type === 'textarea') {
      label.innerHTML = `
        <span>${field.label}</span>
        <textarea name="content_${field.key}" rows="2">${escapeHtml(section.content?.[field.key] || '')}</textarea>
        ${field.help ? `<small>${field.help}</small>` : ''}
      `;
    } else if (field.type === 'columns_editor') {
      label.className = 'full';
      const cols = section.content?.columns || [];
      label.innerHTML = `<span>${field.label}</span>`;
      const editorWrap = document.createElement('div');
      editorWrap.className = 'columns-editor';
      editorWrap.dataset.fieldKey = '__columns';

      function renderColEditor() {
        editorWrap.innerHTML = '';
        const currentCols = JSON.parse(editorWrap.dataset.cols || '[]');

        currentCols.forEach((col, i) => {
          const colDiv = document.createElement('div');
          colDiv.className = 'col-editor-item';
          colDiv.draggable = true;
          colDiv.dataset.idx = i;
          colDiv.innerHTML = `<div class="col-editor-header">
            <span class="col-drag-handle" aria-hidden="true">⋮⋮</span>
            <span>Columna ${i+1}</span>
            <div class="col-header-actions">
              <button type="button" class="btn btn--ghost btn--sm col-move-up" data-idx="${i}" ${i===0?'disabled':''}>↑</button>
              <button type="button" class="btn btn--ghost btn--sm col-move-down" data-idx="${i}" ${i===currentCols.length-1?'disabled':''}>↓</button>
              <button type="button" class="link-btn col-remove" data-idx="${i}">Eliminar</button>
            </div>
          </div>`;

          // ── Construir filas de campos reordenables ──
          // El orden de los campos se guarda en col.__field_order
          const allFieldKeys = [
            ...field.columnFields.map(cf => cf.key),
            '__image'
          ];
          const fieldOrder = col.__field_order || allFieldKeys;
          // Asegurar que no falten ni sobren keys
          const orderedKeys = [
            ...fieldOrder.filter(k => allFieldKeys.includes(k)),
            ...allFieldKeys.filter(k => !fieldOrder.includes(k))
          ];

          const fieldsContainer = document.createElement('div');
          fieldsContainer.className = 'col-fields-container';
          fieldsContainer.dataset.col = i;

          orderedKeys.forEach(key => {
            const row = document.createElement('div');
            row.className = 'col-field-row';
            row.draggable = true;
            row.dataset.fieldKey = key;
            row.dataset.col = i;

            const handle = document.createElement('span');
            handle.className = 'col-field-handle';
            handle.setAttribute('aria-hidden', 'true');
            handle.textContent = '⋮⋮';
            row.appendChild(handle);

            const content = document.createElement('div');
            content.className = 'col-field-content';

            if (key === '__image') {
              // Campo imagen
              content.innerHTML = `
                <label><span>Imagen de la columna</span></label>
                ${col.image_url ? `<img src="${storageUrl(col.image_url)}" class="col-img-preview" alt="" />` : ''}
                <div class="col-img-actions">
                  <label class="btn btn--ghost btn--sm col-img-upload-label">
                    ${col.image_url ? '↺ Cambiar' : '+ Subir imagen'}
                    <input type="file" accept="image/*" class="col-img-input" data-col="${i}" hidden />
                  </label>
                  ${col.image_url ? `<button type="button" class="btn btn--danger btn--sm col-img-remove" data-col="${i}">Quitar</button>` : ''}
                  <input type="text" class="col-img-size-input" data-col="${i}" data-cfield="image_size"
                    placeholder="100%" value="${escapeHtml(col.image_size || '')}"
                    style="width:90px;font-size:12px;" title="Tamaño: ej. 200px, 40vw, 100%" />
                </div>
                <small style="color:var(--muted);font-size:11px">Tamaño (px, vw, %)</small>
                <div class="col-img-uploading" hidden>Subiendo...</div>
              `;
            } else {
              const cf = field.columnFields.find(f => f.key === key);
              if (!cf) { row.remove(); return; }
              if (cf.type === 'checkbox') {
                content.innerHTML = `<label class="checkbox"><input type="checkbox" data-col="${i}" data-cfield="${cf.key}" ${col[cf.key] ? 'checked' : ''}/><span>${cf.label}</span></label>`;
              } else {
                content.innerHTML = `<label><span>${cf.label}</span><input type="text" data-col="${i}" data-cfield="${cf.key}" value="${escapeHtml(col[cf.key] || '')}" placeholder="${cf.placeholder || ''}"/></label>`;
              }
            }

            row.appendChild(content);
            fieldsContainer.appendChild(row);
          });

          colDiv.appendChild(fieldsContainer);
          editorWrap.appendChild(colDiv);
        });

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn--ghost btn--sm';
        addBtn.textContent = '+ Agregar columna';
        addBtn.onclick = () => {
          const c = JSON.parse(editorWrap.dataset.cols || '[]');
          c.push({});
          editorWrap.dataset.cols = JSON.stringify(c);
          renderColEditor();
        };
        editorWrap.appendChild(addBtn);

        // ── Drag & drop COLUMNAS completas ──
        let dragColIdx = null;
        editorWrap.querySelectorAll('.col-editor-item').forEach(item => {
          item.addEventListener('dragstart', e => {
            if (e.target.closest('.col-fields-container')) { e.stopPropagation(); return; }
            dragColIdx = Number(item.dataset.idx);
            item.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
          });
          item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
          item.addEventListener('dragover', e => {
            if (e.target.closest('.col-fields-container')) return;
            e.preventDefault(); item.classList.add('drag-over');
          });
          item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
          item.addEventListener('drop', e => {
            if (e.target.closest('.col-fields-container')) return;
            e.preventDefault(); item.classList.remove('drag-over');
            const targetIdx = Number(item.dataset.idx);
            if (dragColIdx === null || dragColIdx === targetIdx) return;
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            const [moved] = c.splice(dragColIdx, 1);
            c.splice(targetIdx, 0, moved);
            editorWrap.dataset.cols = JSON.stringify(c);
            dragColIdx = null;
            renderColEditor();
          });
        });

        // ── Drag & drop CAMPOS internos ──
        let dragFieldKey = null, dragFieldColIdx = null;
        editorWrap.querySelectorAll('.col-fields-container').forEach(container => {
          const colIdx = Number(container.dataset.col);
          container.querySelectorAll('.col-field-row').forEach(row => {
            row.addEventListener('dragstart', e => {
              e.stopPropagation();
              dragFieldKey = row.dataset.fieldKey;
              dragFieldColIdx = colIdx;
              row.classList.add('is-dragging');
              e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
            row.addEventListener('dragover', e => { e.stopPropagation(); e.preventDefault(); row.classList.add('drag-over'); });
            row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
            row.addEventListener('drop', e => {
              e.stopPropagation(); e.preventDefault();
              row.classList.remove('drag-over');
              if (!dragFieldKey || dragFieldColIdx !== colIdx) return;
              const targetKey = row.dataset.fieldKey;
              if (dragFieldKey === targetKey) return;
              const c = JSON.parse(editorWrap.dataset.cols || '[]');
              const col = c[colIdx];
              const allKeys = [...field.columnFields.map(f => f.key), '__image'];
              const order = col.__field_order ? [...col.__field_order] : [...allKeys];
              const fromIdx = order.indexOf(dragFieldKey);
              const toIdx = order.indexOf(targetKey);
              if (fromIdx < 0 || toIdx < 0) return;
              const [moved] = order.splice(fromIdx, 1);
              order.splice(toIdx, 0, moved);
              col.__field_order = order;
              editorWrap.dataset.cols = JSON.stringify(c);
              dragFieldKey = null; dragFieldColIdx = null;
              renderColEditor();
            });
          });
        });

        // Eliminar columna
        editorWrap.querySelectorAll('.col-remove').forEach(btn => {
          btn.onclick = () => {
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            c.splice(Number(btn.dataset.idx), 1);
            editorWrap.dataset.cols = JSON.stringify(c);
            renderColEditor();
          };
        });

        // Mover arriba / abajo
        editorWrap.querySelectorAll('.col-move-up').forEach(btn => {
          btn.onclick = () => {
            const idx = Number(btn.dataset.idx);
            if (idx === 0) return;
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            [c[idx-1], c[idx]] = [c[idx], c[idx-1]];
            editorWrap.dataset.cols = JSON.stringify(c);
            renderColEditor();
          };
        });
        editorWrap.querySelectorAll('.col-move-down').forEach(btn => {
          btn.onclick = () => {
            const idx = Number(btn.dataset.idx);
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            if (idx >= c.length - 1) return;
            [c[idx], c[idx+1]] = [c[idx+1], c[idx]];
            editorWrap.dataset.cols = JSON.stringify(c);
            renderColEditor();
          };
        });

        // Cambios en inputs de texto/checkbox/select
        editorWrap.querySelectorAll('[data-col]').forEach(inp => {
          if (inp.type === 'file') return;

          const saveValue = () => {
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            const idx = Number(inp.dataset.col);
            const fkey = inp.dataset.cfield;
            if (fkey === undefined || fkey === null || fkey === '') return;
            c[idx][fkey] = inp.type === 'checkbox' ? inp.checked : inp.value;
            editorWrap.dataset.cols = JSON.stringify(c);
          };

          if (inp.type === 'checkbox') {
            inp.addEventListener('change', saveValue);
          } else if (inp.tagName === 'SELECT') {
            inp.addEventListener('change', saveValue);
          } else {
            // Texto: guardar en tiempo real al escribir
            inp.addEventListener('input', saveValue);
            inp.addEventListener('change', saveValue);
          }
        });

        // Subir imagen de columna
        editorWrap.querySelectorAll('.col-img-input').forEach(fileInput => {
          fileInput.addEventListener('change', async () => {
            const rawFile = fileInput.files[0];
            if (!rawFile) return;
            const idx = Number(fileInput.dataset.col);
            const uploadingEl = fileInput.closest('.col-field-content').querySelector('.col-img-uploading');
            if (uploadingEl) uploadingEl.hidden = false;

            // Comprimir antes de subir
            const file = await compressImage(rawFile, { maxW: 1200, maxH: 1200, quality: 0.78 });
            const ext  = file.name.split('.').pop().toLowerCase();
            const path = `${state.currentInvitation.id}/columns/col-${idx}-${Date.now()}.${ext}`;
            const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
            if (uploadingEl) uploadingEl.hidden = true;
            if (upErr) { toast('Error: ' + upErr.message, 'error'); return; }
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            c[idx].image_url = path;
            editorWrap.dataset.cols = JSON.stringify(c);
            toast('Imagen subida ✓');
            renderColEditor();
          });
        });

        // Quitar imagen
        editorWrap.querySelectorAll('.col-img-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.col);
            const c = JSON.parse(editorWrap.dataset.cols || '[]');
            c[idx].image_url = null;
            editorWrap.dataset.cols = JSON.stringify(c);
            renderColEditor();
          });
        });
      }

      editorWrap.dataset.cols = JSON.stringify(cols);
      renderColEditor();
      label.appendChild(editorWrap);
    } else if (field.type === 'select') {
      const opts = field.options.map(o =>
        `<option value="${o.value}" ${section.content?.[field.key] === o.value ? 'selected' : ''}>${o.label}</option>`
      ).join('');
      label.innerHTML = `
        <span>${field.label}</span>
        <select name="content_${field.key}">${opts}</select>
      `;
    } else if (field.type === 'color') {
      const currentVal = section.content?.[field.key] || '';
      const hasColor = !!(currentVal && currentVal !== '#000000');
      label.innerHTML = `
        <span>${field.label}</span>
        <div class="color-field-wrap">
          <label class="color-field-toggle">
            <input type="checkbox" class="color-enable-check" ${hasColor ? 'checked' : ''} />
            <span>${hasColor ? 'Personalizado' : 'Usar tema'}</span>
          </label>
          <input type="color" name="content_${field.key}"
                 value="${hasColor ? currentVal : '#c9a961'}"
                 style="display:${hasColor ? 'inline-block' : 'none'}" />
        </div>
        ${field.help ? `<small>${field.help}</small>` : ''}
      `;
      const check = label.querySelector('.color-enable-check');
      const colorInp = label.querySelector('input[type="color"]');
      const toggleSpan = label.querySelector('.color-field-toggle span');
      check.addEventListener('change', () => {
        colorInp.style.display = check.checked ? 'inline-block' : 'none';
        toggleSpan.textContent = check.checked ? 'Personalizado' : 'Usar tema';
        if (!check.checked) colorInp.value = '#000000';
      });
    } else {
      label.innerHTML = `
        <span>${field.label}</span>
        <input type="${field.type || 'text'}" name="content_${field.key}"
               value="${escapeHtml(section.content?.[field.key] ?? '')}"
               ${field.min != null ? `min="${field.min}"` : ''}
               ${field.max != null ? `max="${field.max}"` : ''} />
        ${field.help ? `<small>${field.help}</small>` : ''}
      `;
    }
    fieldsEl.appendChild(label);
  });

  // ── Imagen de fondo ──
  const bgFileInput = drawer.querySelector('[name="section_bg_image"]');
  const bgCurrent = $('#section-bg-current');
  const bgPreview = $('#section-bg-preview');

  // SIEMPRE resetear el file input al abrir una sección nueva
  bgFileInput.value = '';
  modal._clearBg = false;

  if (section.bg_image_url) {
    bgPreview.src = storageUrl(section.bg_image_url);
    bgPreview.hidden = false;
    bgCurrent.textContent = 'Imagen actual guardada';
  } else {
    bgPreview.src = '';
    bgPreview.hidden = true;
    bgCurrent.textContent = '';
  }

  // Usar clone para eliminar listeners anteriores acumulados
  const bgFileInputClone = bgFileInput.cloneNode(true);
  bgFileInput.parentNode.replaceChild(bgFileInputClone, bgFileInput);
  modal._bgFile = null; // resetear archivo pendiente

  bgFileInputClone.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    modal._bgFile = file;
    drawer._bgFile = file;
    drawer._previewBgUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = ev => {
      bgPreview.src = ev.target.result;
      bgPreview.hidden = false;
      bgCurrent.textContent = '(nueva imagen — se guardará)';
      schedulePreviewUpdate();
    };
    reader.readAsDataURL(file);
    modal._clearBg = false;
    drawer._clearBg = false;
  });

  const clearBgBtn = $('#clear-section-bg');
  const clearBgClone = clearBgBtn.cloneNode(true);
  clearBgBtn.parentNode.replaceChild(clearBgClone, clearBgBtn);
  clearBgClone.addEventListener('click', () => {
    bgFileInputClone.value = '';
    modal._bgFile = null;
    drawer._bgFile = null;
    bgPreview.src = '';
    bgPreview.hidden = true;
    bgCurrent.textContent = '(se quitará al guardar)';
    modal._clearBg = true;
    drawer._clearBg = true;
  });

  // Overlay y blur
  const overlayInput = drawer.querySelector('[name="bg_overlay"]');
  const overlayValue = $('#bg-overlay-value');
  const minHeightInput = drawer.querySelector('[name="min_height"]');

  minHeightInput.value = section.min_height || '';

  // Height picker presets
  const heightPresets = drawer.querySelectorAll('.height-preset');
  function updateHeightPresets(val) {
    heightPresets.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.value === val);
    });
  }
  updateHeightPresets(section.min_height || '');
  heightPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      minHeightInput.value = btn.dataset.value;
      updateHeightPresets(btn.dataset.value);
    });
  });
  minHeightInput.addEventListener('input', () => {
    updateHeightPresets(minHeightInput.value);
  });
  overlayInput.value = section.bg_overlay ?? 0;
  overlayValue.textContent = overlayInput.value;
  overlayInput.addEventListener('input', () => {
    overlayValue.textContent = Number(overlayInput.value).toFixed(2);
  });

  const blurInput = drawer.querySelector('[name="bg_blur"]');
  const blurValue = $('#bg-blur-value');
  blurInput.value = section.bg_blur ?? 0;
  blurValue.textContent = blurInput.value;
  blurInput.addEventListener('input', () => {
    blurValue.textContent = blurInput.value;
  });

  // Abrir drawer
  drawer.hidden = false;
  document.body.style.overflow = 'hidden';
  // Cargar preview
  loadPreview();
}

function contentFieldsFor(type) {
  const common = [
    { key: 'title', label: 'Título', full: true },
    { key: 'subtitle', label: 'Subtítulo', full: true }
  ];
  return ({
    hero: [
      { key: 'eyebrow', label: 'Eyebrow (texto pequeño superior)', full: true,
        help: 'Si se deja vacío, usa el tipo de evento' },
      { key: 'subtitle', label: 'Subtítulo', full: true },
      { key: 'quote', label: 'Frase / cita', full: true, type: 'textarea' },
      { key: 'text_position', label: 'Posición del texto', type: 'select', full: true,
        options: [
          { value: 'center', label: '⊕ Centro (default)' },
          { value: 'bottom-left', label: '↙ Abajo izquierda' },
          { value: 'bottom-center', label: '↓ Abajo centro' },
          { value: 'bottom-right', label: '↘ Abajo derecha' },
          { value: 'top-left', label: '↖ Arriba izquierda' },
          { value: 'top-center', label: '↑ Arriba centro' },
        ]
      },
      { key: 'text_size', label: 'Tamaño del nombre', type: 'select', full: true,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Grande' },
          { value: 'xlarge', label: 'Muy grande' },
        ]
      },
      { key: 'text_weight', label: 'Peso del texto', type: 'select', full: true,
        options: [
          { value: 'light', label: 'Liviano (default)' },
          { value: 'normal', label: 'Normal' },
          { value: 'bold', label: 'Bold' },
        ]
      },
    ],
    countdown: [
      ...common,
      { key: 'box_style', label: 'Estilo de los cuadros', type: 'select', full: true,
        options: [
          { value: 'square',   label: '⬜ Cuadrado (bordes rectos)' },
          { value: 'rounded',  label: '🟦 Redondeado' },
          { value: 'bevel',    label: '◻ Bisel tenue (sombra suave)' },
          { value: 'circle',   label: '⭕ Circular' },
          { value: 'minimal',  label: '— Minimal (sin caja, solo número)' },
        ]
      },
    ],
    rsvp: [
      ...common,
      { key: 'button_text', label: 'Texto del botón', full: true },
      { key: 'button_bg', label: 'Color de fondo del botón', type: 'color', full: false,
        help: 'Vacío = usa el color primario del tema' },
      { key: 'button_color', label: 'Color del texto del botón', type: 'color', full: false,
        help: 'Vacío = blanco' },
      { key: 'button_bg_hover', label: 'Color fondo al pasar el mouse', type: 'color', full: false },
      { key: 'button_color_hover', label: 'Color texto al pasar el mouse', type: 'color', full: false },
    ],
    calendar: [
      ...common,
      { key: 'button_text', label: 'Texto del botón Google', full: true },
      { key: 'duration_hours', label: 'Duración (horas)', type: 'number', min: 1, max: 24 },
      { key: 'show_ics', label: 'Mostrar botón "Descargar .ics"', type: 'checkbox' },
      { key: 'button_bg', label: 'Color de fondo del botón', type: 'color', full: false,
        help: 'Vacío = usa el color de acento del tema' },
      { key: 'button_color', label: 'Color del texto del botón', type: 'color', full: false },
      { key: 'button_bg_hover', label: 'Color fondo al pasar el mouse', type: 'color', full: false },
      { key: 'button_color_hover', label: 'Color texto al pasar el mouse', type: 'color', full: false },
    ],
    gallery: [
      ...common,
      { key: 'layout', label: 'Diseño de la galería', type: 'select',
        options: [
          { value: 'masonry', label: 'Mosaico (masonry)' },
          { value: 'grid', label: 'Cuadrícula uniforme' },
          { value: 'stack', label: 'Una debajo de la otra' },
          { value: 'horizontal', label: 'Tira horizontal (scroll)' },
          { value: 'featured', label: 'Destacada + miniaturas' },
        ],
        full: true
      }
    ],
    location: [
      { key: 'eyebrow', label: 'Eyebrow (ej: ¿Dónde?)', full: true },
      { key: 'title', label: 'Título (ej: nombre del salón)', full: true },
      { key: 'address', label: 'Dirección completa', full: true,
        help: 'Si se omite, usa la ubicación del calendario' },
      { key: 'map_url', label: 'URL embed de Google Maps (opcional)', full: true,
        help: 'En Google Maps → Compartir → Insertar mapa → copiá la URL del src del iframe. Si se omite, se genera automáticamente.' },
      { key: 'map_height', label: 'Altura del mapa (px)', type: 'number', min: 200, max: 800,
        help: 'Altura en desktop. Default: 380px' },
      { key: 'map_height_mobile', label: 'Altura mapa mobile (px)', type: 'number', min: 150, max: 500,
        help: 'Altura en mobile. Default: 260px' },
    ],
    footer: [
      { key: 'tagline',    label: 'Texto pequeño (ej: Invitación digital)', full: true,
        help: 'Dejalo vacío para ocultarlo' },
      { key: 'vylo_link',  label: 'Link del logo Vylo', full: true,
        help: 'URL a la que lleva el logo al hacer click (ej: https://vylo.com.ar)' },
      { key: 'show_hosts', label: 'Mostrar nombre del/los anfitriones', type: 'checkbox' },
      { key: 'show_event', label: 'Mostrar tipo y título del evento',   type: 'checkbox' },
      { key: 'show_date',  label: 'Mostrar fecha del evento',           type: 'checkbox' },
      { key: 'show_logo',  label: 'Mostrar logo Vylo',                  type: 'checkbox' },
    ],
    info: [
      { key: 'title', label: 'Título (opcional)', full: true },
      { key: 'subtitle', label: 'Subtítulo (opcional)', full: true },
      { key: '__columns_editor', label: 'Columnas', type: 'columns_editor', full: true,
        columnFields: [
          { key: 'icon',         label: 'Emoji / ícono', placeholder: '👗' },
          { key: 'label',        label: 'Label pequeño', placeholder: 'DRESS CODE' },
          { key: 'title',        label: 'Título grande', placeholder: 'Elegante' },
          { key: 'text',         label: 'Texto descriptivo', placeholder: 'Colores claros y azul' },
        ]
      }
    ],
    gift: [
      { key: 'title', label: 'Título de la sección', full: true },
      { key: 'subtitle', label: 'Subtítulo', full: true },
      { key: '__columns_editor', label: 'Columnas', type: 'columns_editor', full: true,
        columnFields: [
          { key: 'icon',        label: 'Emoji / ícono', placeholder: '🎁' },
          { key: 'label',       label: 'Label pequeño', placeholder: 'REGALO' },
          { key: 'title',       label: 'Título', placeholder: 'Tu presencia es lo más importante' },
          { key: 'text',        label: 'Texto', placeholder: 'Pero si deseás hacerme un regalo...' },
          { key: 'alias',       label: 'Alias (ej: MESA.ARBOL.MAR)', placeholder: 'MESA.ARBOL.MAR' },
          { key: 'mp_redirect', label: 'Redirigir a Mercado Pago', type: 'checkbox' },
          { key: 'mp_alias',    label: 'Alias de Mercado Pago (para link directo)', placeholder: 'MESA.ARBOL.MAR' },
        ]
      }
    ]
  })[type] || [];
}

document.getElementById('drawer-close-btn').addEventListener('click', () => closeDrawer());
document.getElementById('cancel-section-btn').addEventListener('click', () => closeDrawer());

$$('#section-modal [data-clear]').forEach(btn => {
  btn.addEventListener('click', () => {
    
    f[btn.dataset.clear].value = '';
  });
});

document.getElementById('section-drawer-form').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.dataset.action === 'close') return;
  e.preventDefault();
  const f = e.target;
  const section = state.editingSection;
  const drawer = document.getElementById('section-drawer');
  const modal = { _clearBg: drawer._clearBg || false, _bgFile: drawer._bgFile || null };
  const fd = new FormData(f);

  console.log('[Modal] Guardando sección:', section.section_type);

  // Reconstruir content
  const content = { ...(section.content || {}) };
  const stringFields = ['title','subtitle','eyebrow','quote','button_text','layout',
    'text_position','text_size','text_weight',
    'button_bg','button_color','button_bg_hover','button_color_hover',
    'tagline','vylo_link','box_style'];
  const colorFields = ['button_bg','button_color','button_bg_hover','button_color_hover'];

  for (const [key, value] of fd.entries()) {
    if (key.startsWith('content_')) {
      const k = key.replace('content_', '');
      if (colorFields.includes(k)) {
        content[k] = (value && value !== '#000000') ? value : null;
      } else if (stringFields.includes(k)) {
        content[k] = value;
      } else {
        content[k] = isNaN(value) || value === '' ? value : Number(value);
      }
    }
  }
  // Leer columnas de columns_editor si existe
  const colsEditor = drawer.querySelector('.columns-editor');
  if (colsEditor) {
    const cols = JSON.parse(colsEditor.dataset.cols || '[]');
    console.log('[Modal] Columnas guardadas:', JSON.stringify(cols));
    content.columns = cols;
  }

  // Checkboxes — no aparecen en FormData si están desmarcados, leer del DOM
  const checkboxFields = ['show_ics','show_hosts','show_event','show_date','show_logo'];
  checkboxFields.forEach(k => {
    const el = f.querySelector(`[name="content_${k}"]`);
    if (el) content[k] = el.checked;
  });

  // Colores: solo guardar si son distintos de negro puro (#000000)
  // Negro puro = el valor por defecto del color picker sin tocar
  const bgColor = f.background_color.value;
  const txtColor = f.text_color.value;
  const hasBgColorData = section.background_color; // ya tenía color guardado

  const update = {
    is_enabled: f.is_enabled.checked,
    background_color: (bgColor && bgColor !== '#000000') || hasBgColorData ? (bgColor !== '#000000' ? bgColor : null) : null,
    text_color: (txtColor && txtColor !== '#000000') ? txtColor : null,
    heading_font: fd.get('heading_font') || null,
    body_font: fd.get('body_font') || null,
    font_size: f.font_size.value ? Number(f.font_size.value) : null,
    padding_y: f.padding_y.value !== '' ? Number(f.padding_y.value) : 80,
    min_height: f.min_height.value.trim() || null,
    bg_overlay: Number(f.bg_overlay.value) || 0,
    bg_blur: Number(f.bg_blur.value) || 0,
    bottom_transition: f.bottom_transition.value || 'none',
    top_transition: f.top_transition.value || 'none',
    motion_effect: f.motion_effect.value || 'none',
    particle_effect: f.particle_effect.value || 'none',
    particle_intensity: Number(f.particle_intensity.value) || 50,
    content
  };

  console.log('[Modal] Fuentes guardadas — heading:', fd.get('heading_font'), '| body:', fd.get('body_font'));
  console.log('[Modal] Update a guardar:', update);

  // Imagen de fondo — leer desde modal._bgFile (el input fue clonado fuera del form)
  const bgFile = modal._bgFile || null;

  // Quitar imagen de fondo
  if (modal._clearBg) {
    update.bg_image_url = null;
  } else if (!bgFile || bgFile.size === 0) {
    // No se tocó la imagen — preservar la actual
    update.bg_image_url = section.bg_image_url || null;
  }

  // Subir nueva imagen de fondo si se seleccionó
  if (bgFile && bgFile.size > 0) {
    toast('Comprimiendo imagen...');
    const compressed = await compressImage(bgFile, { maxW: 1920, maxH: 1920, quality: 0.82 });
    const ext  = compressed.name.split('.').pop().toLowerCase();
    const path = `${state.currentInvitation.id}/sections/${section.id}-bg.${ext}`;
    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET).upload(path, compressed, { upsert: true });
    if (upErr) { toast('Error subiendo imagen: ' + upErr.message, 'error'); return; }
    update.bg_image_url = path;
  }

  const { error } = await sb.from('sections')
    .update(update).eq('id', section.id);
  if (error) { toast(error.message, 'error'); return; }

  Object.assign(section, update);
  renderSectionsList();
  reloadPreviewAfterSave();
  closeDrawer();
  toast('Sección actualizada');
});

// ============================================================
// GALERÍA
// ============================================================
function renderGalleryList() {
  const ul = $('#gallery-list');
  ul.innerHTML = '';

  if (!state.currentGallery.length) {
    ul.innerHTML = '<li style="grid-column:1/-1;color:var(--muted);font-style:italic;padding:1rem 0;">No hay imágenes aún. Subí algunas con el botón de arriba.</li>';
    return;
  }

  state.currentGallery.forEach(img => {
    const li = document.createElement('li');
    li.className = 'gallery-img-item';
    li.dataset.id = img.id;

    const imgUrl = storageUrl(img.image_url);
    li.innerHTML = `
      <img src="${imgUrl}" alt="${escapeHtml(img.alt_text)}"
           onerror="this.style.background='#eee';this.style.minHeight='120px'" />
      <button type="button" class="gallery-img-item__remove" aria-label="Eliminar imagen" title="Eliminar">×</button>
      <div class="gallery-img-item__body">
        <input type="text" data-field="alt_text"
               placeholder="Texto alternativo (obligatorio)"
               value="${escapeHtml(img.alt_text)}" />
        <input type="text" data-field="caption"
               placeholder="Pie de foto (opcional)"
               value="${escapeHtml(img.caption || '')}" />
        <button type="button" class="btn btn--ghost btn--sm save-caption-btn">Guardar</button>
      </div>
    `;

    // Guardar alt y caption
    li.querySelector('.save-caption-btn').addEventListener('click', async () => {
      const alt = li.querySelector('[data-field="alt_text"]').value.trim();
      const caption = li.querySelector('[data-field="caption"]').value.trim();
      if (!alt) { toast('El texto alternativo es obligatorio', 'error'); return; }
      const { error } = await sb.from('gallery_images')
        .update({ alt_text: alt, caption: caption || null })
        .eq('id', img.id);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      img.alt_text = alt;
      img.caption = caption;
      toast('Imagen actualizada');
    });

    // Eliminar
    li.querySelector('.gallery-img-item__remove').addEventListener('click', () => removeGalleryImage(img, li));

    ul.appendChild(li);
  });
}

$('#gallery-upload-input').addEventListener('change', async e => {
  const files = [...e.target.files];
  if (!files.length) return;

  const btn = e.target.closest('label');
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';

  let subidas = 0;
  for (const file of files) {
    // Validar tipo y tamaño (max 5MB)
    if (!file.type.startsWith('image/')) {
      toast(`${file.name} no es una imagen válida`, 'error');
      continue;
    }

    // Comprimir antes de subir (sin límite de tamaño previo — la compresión lo maneja)
    toast(`Comprimiendo ${file.name}...`);
    const compressed = await compressImage(file, { maxW: 1600, maxH: 1600, quality: 0.80 });
    const ext  = compressed.name.split('.').pop().toLowerCase();
    const path = `${state.currentInvitation.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    console.log('[Gallery] Subiendo:', path, `(${Math.round(compressed.size/1024)}KB)`);
    const { error: upErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(path, compressed, { cacheControl: '3600', upsert: false });

    if (upErr) {
      console.error('[Gallery] Error upload:', upErr);
      toast(`Error subiendo ${file.name}: ${upErr.message}`, 'error');
      continue;
    }

    const { data, error } = await sb.from('gallery_images').insert({
      invitation_id: state.currentInvitation.id,
      image_url: path,
      alt_text: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      caption: null,
      position: state.currentGallery.length
    }).select().single();

    if (error) {
      console.error('[Gallery] Error DB:', error);
      toast(`Error guardando ${file.name}: ${error.message}`, 'error');
      continue;
    }

    state.currentGallery.push(data);
    subidas++;
  }

  btn.style.opacity = '';
  btn.style.pointerEvents = '';
  e.target.value = '';
  renderGalleryList();

  if (subidas > 0) toast(`${subidas} imagen${subidas > 1 ? 'es' : ''} subida${subidas > 1 ? 's' : ''} ✓`);
});

async function removeGalleryImage(img, liEl) {
  if (!confirm(`¿Eliminar esta imagen?\nEsta acción no se puede deshacer.`)) return;

  // Deshabilitar el botón visualmente
  if (liEl) liEl.style.opacity = '0.4';

  // 1. Eliminar del storage
  if (img.image_url && !img.image_url.startsWith('http')) {
    const { error: storageErr } = await sb.storage
      .from(STORAGE_BUCKET).remove([img.image_url]);
    if (storageErr) console.warn('[Gallery] Error borrando storage:', storageErr);
  }

  // 2. Eliminar de la BD
  const { error } = await sb.from('gallery_images').delete().eq('id', img.id);
  if (error) {
    toast('Error al eliminar: ' + error.message, 'error');
    if (liEl) liEl.style.opacity = '';
    return;
  }

  state.currentGallery = state.currentGallery.filter(g => g.id !== img.id);
  renderGalleryList();
  toast('Imagen eliminada');
}

// ============================================================
// PUBLICAR / ELIMINAR INVITACIÓN
// ============================================================
$('#publish-btn').addEventListener('click', async () => {
  const inv = state.currentInvitation;
  const newState = !inv.is_published;
  const { error } = await sb.from('invitations')
    .update({ is_published: newState }).eq('id', inv.id);
  if (error) { toast(error.message, 'error'); return; }
  inv.is_published = newState;
  updateEditorHeader();
  await loadInvitations();
  toast(newState ? 'Invitación publicada ✓' : 'Invitación despublicada');
});

$('#delete-btn').addEventListener('click', async () => {
  const inv = state.currentInvitation;

  // Primera confirmación
  const first = confirm(`¿Eliminar la invitación de "${inv.host_names}"?\n\nEsto eliminará toda la información, imágenes y secciones. Esta acción no se puede deshacer.`);
  if (!first) return;

  // Segunda confirmación — escribir el nombre
  const typed = prompt(`Para confirmar, escribí exactamente:\n\n${inv.host_names}`);
  if (typed === null) return; // canceló
  if (typed.trim() !== inv.host_names.trim()) {
    alert('El nombre no coincide. La invitación NO fue eliminada.');
    return;
  }

  // Eliminar imágenes del storage primero
  try {
    const { data: files } = await sb.storage.from(STORAGE_BUCKET).list(inv.id, { limit: 200 });
    if (files?.length) {
      const paths = files.map(f => `${inv.id}/${f.name}`);
      await sb.storage.from(STORAGE_BUCKET).remove(paths);
    }
    // Subcarpetas (columns, etc.)
    const { data: subFiles } = await sb.storage.from(STORAGE_BUCKET).list(`${inv.id}/columns`, { limit: 200 });
    if (subFiles?.length) {
      const subPaths = subFiles.map(f => `${inv.id}/columns/${f.name}`);
      await sb.storage.from(STORAGE_BUCKET).remove(subPaths);
    }
  } catch (e) {
    console.warn('No se pudieron eliminar algunas imágenes:', e);
  }

  // Eliminar de la BD (cascade elimina secciones y links)
  const { error } = await sb.from('invitations').delete().eq('id', inv.id);
  if (error) { toast('Error al eliminar: ' + error.message, 'error'); return; }

  state.currentInvitation = null;
  $('#editor').hidden = true;
  $('#empty-state').hidden = false;
  await loadInvitations();
  toast('Invitación eliminada correctamente');
});

// ============================================================
// SHORT LINKS
// ============================================================
const SHORT_BASE = 'https://vylo-short-links.ezmezdev.workers.dev/s';

async function loadLinks() {
  const inv = state.currentInvitation;
  if (!inv) return;
  const { data, error } = await sb.from('short_links')
    .select('*')
    .eq('invitation_id', inv.id)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  renderLinksList(data || []);
}

function renderLinksList(links) {
  const ul = $('#links-list');
  ul.innerHTML = '';
  if (!links.length) {
    ul.innerHTML = '<li style="color:var(--muted);font-style:italic;padding:0.5rem 0">No hay links creados aún.</li>';
    return;
  }
  links.forEach(link => {
    const shortUrl = `${SHORT_BASE}/${link.code}`;
    const li = document.createElement('li');
    li.className = 'link-item';
    li.innerHTML = `
      <div class="link-item__url">${shortUrl}</div>
      <div class="link-item__meta">
        <span class="link-item__clicks">👁 ${link.clicks || 0} clicks</span>
        <span>${new Date(link.created_at).toLocaleDateString('es-ES')}</span>
      </div>
      <div class="link-item__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-action="copy" data-url="${shortUrl}">
          Copiar
        </button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="share" data-url="${shortUrl}" data-title="${escapeHtml(state.currentInvitation.host_names)}">
          Compartir
        </button>
        <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${link.id}">
          Eliminar
        </button>
      </div>
    `;

    li.querySelector('[data-action="copy"]').addEventListener('click', e => {
      navigator.clipboard.writeText(e.target.dataset.url);
      toast('Link copiado al portapapeles ✓');
    });

    li.querySelector('[data-action="share"]').addEventListener('click', e => {
      const btn = e.currentTarget;
      if (navigator.share) {
        navigator.share({
          title: `Invitación de ${btn.dataset.title}`,
          url: btn.dataset.url
        });
      } else {
        navigator.clipboard.writeText(btn.dataset.url);
        toast('Link copiado (Web Share no disponible)');
      }
    });

    li.querySelector('[data-action="delete"]').addEventListener('click', async e => {
      if (!confirm('¿Eliminar este link corto?')) return;
      const { error } = await sb.from('short_links').delete().eq('id', e.target.dataset.id);
      if (error) { toast(error.message, 'error'); return; }
      toast('Link eliminado');
      loadLinks();
    });

    ul.appendChild(li);
  });
}

// Generar código aleatorio
$('#generate-code-btn').addEventListener('click', () => {
  const inv = state.currentInvitation;
  const base = inv.host_names.split(/[\s&y]+/)[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const rand = Math.random().toString(36).slice(2, 5);
  $('#form-new-link [name="code"]').value = `${base}${rand}`;
});

// Crear nuevo link
$('#form-new-link').addEventListener('submit', async e => {
  e.preventDefault();
  const code = e.target.code.value.trim().toLowerCase();
  if (!code) return;

  const inv = state.currentInvitation;
  const targetUrl = `${window.location.origin}/public/?i=${inv.slug}`;

  const { error } = await sb.from('short_links').insert({
    code,
    invitation_id: inv.id,
    target_url: targetUrl,
    clicks: 0
  });

  if (error) {
    if (error.code === '23505') {
      toast('Ese código ya existe, elegí otro', 'error');
    } else {
      toast(error.message, 'error');
    }
    return;
  }

  e.target.code.value = '';
  toast(`Link creado: ${SHORT_BASE}/${code} ✓`);
  loadLinks();
});

// ============================================================
// DRAWER + PREVIEW EN TIEMPO REAL
// ============================================================
const previewIframe    = document.getElementById('preview-iframe');
const previewReloadBtn = document.getElementById('preview-reload-btn');
const deviceBtns       = document.querySelectorAll('.preview__device-btn');

function getPreviewUrl() {
  const inv = state.currentInvitation;
  if (!inv) return '';
  return `${window.location.origin}/public/?i=${inv.slug}`;
}

let previewReady = false;

// Listener persistente — no usar .onload que se sobreescribe
previewIframe.addEventListener('load', () => {
  previewReady = true;
  setTimeout(() => sendPreviewMessage(), 200);
});

function loadPreview() {
  const url = getPreviewUrl();
  if (!url) return;
  previewReady = false;
  previewIframe.src = url;
}

function reloadPreview() {
  loadPreview();
}

function reloadPreviewAfterSave() {
  // Después de guardar, recargar el iframe para que use los datos de Supabase
  setTimeout(() => loadPreview(), 900);
}

function closeDrawer() {
  document.getElementById('section-drawer').hidden = true;
  document.body.style.overflow = '';
  previewReady = false;
}

// Construir objeto section desde el formulario actual
function buildSectionFromForm() {
  const section = state.editingSection;
  if (!section) return null;
  const f = document.getElementById('section-drawer-form');
  const fd = new FormData(f);
  const drawer = document.getElementById('section-drawer');

  // Content
  const content = { ...(section.content || {}) };
  const stringFields = ['title','subtitle','eyebrow','quote','button_text','layout',
    'text_position','text_size','text_weight',
    'button_bg','button_color','button_bg_hover','button_color_hover',
    'tagline','vylo_link','box_style'];
  const checkboxFields = ['show_ics','show_hosts','show_event','show_date','show_logo'];

  for (const [key, value] of fd.entries()) {
    if (key.startsWith('content_')) {
      const k = key.replace('content_', '');
      content[k] = stringFields.includes(k) ? value : (isNaN(value) || value === '' ? value : Number(value));
    }
  }
  checkboxFields.forEach(k => {
    const el = f.querySelector(`[name="content_${k}"]`);
    if (el) content[k] = el.checked;
  });

  // Columnas
  const colsEditor = drawer.querySelector('.columns-editor');
  if (colsEditor) content.columns = JSON.parse(colsEditor.dataset.cols || '[]');

  // Construir sección con datos del form
  const previewSection = {
    ...section,
    content,
    background_color: f.querySelector('[name="background_color"]')?._pickerValue || section.background_color,
    text_color:       f.querySelector('[name="text_color"]')?._pickerValue || section.text_color,
    heading_font:     fd.get('heading_font') || section.heading_font || null,
    body_font:        fd.get('body_font') || section.body_font || null,
    font_size:        fd.get('font_size') ? Number(fd.get('font_size')) : section.font_size,
    padding_y:        fd.get('padding_y') ? Number(fd.get('padding_y')) : section.padding_y,
    min_height:       fd.get('min_height') || section.min_height || null,
    bg_overlay:       Number(fd.get('bg_overlay')) || 0,
    bg_blur:          Number(fd.get('bg_blur')) || 0,
    bottom_transition: fd.get('bottom_transition') || 'none',
    top_transition:    fd.get('top_transition') || 'none',
    motion_effect:     fd.get('motion_effect') || 'none',
    particle_effect:   fd.get('particle_effect') || 'none',
    particle_intensity: Number(fd.get('particle_intensity')) || 50,
    // imagen de fondo: si hay nueva imagen pendiente, usar el ObjectURL temporal
    bg_image_url: drawer._previewBgUrl || drawer._bgFile
      ? (drawer._previewBgUrl || section.bg_image_url)
      : section.bg_image_url,
  };

  return previewSection;
}

function sendPreviewMessage() {
  if (!previewReady) return;
  const previewSection = buildSectionFromForm();
  if (!previewSection) return;

  try {
    previewIframe.contentWindow.postMessage({
      type: 'vylo-preview',
      section:    previewSection,
      invitation: state.currentInvitation,
      gallery:    state.currentGallery || [],
    }, '*');
  } catch(e) {
    console.warn('[Preview] postMessage error:', e);
  }
}

// Debounce para no enviar en cada tecla
let previewDebounceTimer = null;
function schedulePreviewUpdate() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => sendPreviewMessage(), 300);
}

// Escuchar cambios en el formulario del drawer
document.getElementById('section-drawer-form').addEventListener('input',  schedulePreviewUpdate);
document.getElementById('section-drawer-form').addEventListener('change', schedulePreviewUpdate);

// Botón actualizar preview — siempre fuerza el envío
previewReloadBtn.addEventListener('click', () => {
  if (previewReady) {
    sendPreviewMessage();
    // Feedback visual
    previewReloadBtn.textContent = '✓ Actualizado';
    setTimeout(() => { previewReloadBtn.textContent = '↺ Actualizar'; }, 1200);
  } else {
    // iframe no cargó todavía — recargar
    loadPreview();
  }
});

// Selector de dispositivo
deviceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    deviceBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    previewIframe.dataset.device = btn.dataset.device;
    previewIframe.setAttribute('data-device', btn.dataset.device);
  });
});

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('section-drawer').hidden) {
    closeDrawer();
  }
});

// ============================================================
// INICIO
// ============================================================
checkAuth();

}); // fin DOMContentLoaded
