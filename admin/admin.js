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
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('[Admin] Cliente Supabase creado OK');

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
// AUTH
// ============================================================
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    state.user = session.user;
    showAdmin();
  } else {
    $('#auth-view').hidden = false;
    $('#admin-view').hidden = true;
  }
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email');
  const password = fd.get('password');
  console.log('[Admin] Intentando login con:', email);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
  await supabase.auth.signOut();
  state.user = null;
  $('#auth-view').hidden = false;
  $('#admin-view').hidden = true;
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
  $('#auth-view').hidden = true;
  $('#admin-view').hidden = false;
  $('#user-email').textContent = state.user.email;
  loadInvitations();
}

// ============================================================
// LISTA DE INVITACIONES
// ============================================================
async function loadInvitations() {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, slug, event_title, host_names, event_date, is_published')
    .order('created_at', { ascending: false });

  if (error) { toast(error.message, 'error'); return; }
  state.invitations = data || [];
  renderInvitationList();
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
  const slug = prompt('Slug para la nueva invitación (ej: boda-ana-luis):');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    toast('Slug inválido', 'error'); return;
  }
  const { data, error } = await supabase
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

  await supabase.from('sections').insert(defaultSections);
  await loadInvitations();
  selectInvitation(data.id);
  toast('Invitación creada');
});

async function selectInvitation(id) {
  $('#empty-state').hidden = true;
  $('#editor').hidden = false;

  const [invRes, secRes, galRes] = await Promise.all([
    supabase.from('invitations').select('*').eq('id', id).single(),
    supabase.from('sections').select('*').eq('invitation_id', id).order('position'),
    supabase.from('gallery_images').select('*').eq('invitation_id', id).order('position')
  ]);

  state.currentInvitation = invRes.data;
  state.currentSections = secRes.data || [];
  state.currentGallery = galRes.data || [];

  renderInvitationList();
  fillGeneralForm();
  fillThemeForm();
  renderSectionsList();
  renderGalleryList();
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

  const preview = $('#hero-preview');
  if (inv.hero_image_url) {
    preview.src = storageUrl(inv.hero_image_url);
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
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

  // Subida de imagen hero si se eligió una
  const heroFile = fd.get('hero_image');
  if (heroFile && heroFile.size > 0) {
    const ext = heroFile.name.split('.').pop();
    const path = `${state.currentInvitation.id}/hero-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, heroFile, { upsert: true });
    if (upErr) { toast(upErr.message, 'error'); return; }
    update.hero_image_url = path;
  }

  const { error } = await supabase.from('invitations')
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
  f.heading_font.value = inv.heading_font;
  f.body_font.value = inv.body_font;
  f.base_font_size.value = inv.base_font_size;
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
  const { error } = await supabase.from('invitations')
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
    hero: 'Portada (Hero)',
    countdown: 'Contador regresivo',
    rsvp: 'Confirmación (RSVP)',
    calendar: 'Calendario',
    gallery: 'Galería'
  })[type] || type;
}

async function toggleSection(section) {
  const { error } = await supabase.from('sections')
    .update({ is_enabled: !section.is_enabled })
    .eq('id', section.id);
  if (error) { toast(error.message, 'error'); return; }
  section.is_enabled = !section.is_enabled;
  renderSectionsList();
}

async function deleteSection(section) {
  if (!confirm(`¿Eliminar la sección "${sectionLabel(section.section_type)}"?`)) return;
  const { error } = await supabase.from('sections').delete().eq('id', section.id);
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
    await supabase.from('sections').update({ position: u.position }).eq('id', u.id);
  }
  state.currentSections = list.map((s, i) => ({ ...s, position: i }));
  renderSectionsList();
}

// ---- Agregar sección ----
$$('.add-section__options button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const type = btn.dataset.add;
    const position = state.currentSections.length;
    const { data, error } = await supabase.from('sections')
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
    hero: { subtitle: '', quote: '' },
    countdown: { title: 'Cuenta regresiva', subtitle: '' },
    rsvp: { title: 'Confirma tu asistencia', subtitle: '', button_text: 'Confirmar' },
    calendar: { title: 'Guarda la fecha', subtitle: '', button_text: 'Agregar al calendario', duration_hours: 4 },
    gallery: { title: 'Galería', subtitle: '' }
  })[type] || {};
}

// ---- Modal de edición de sección ----
function openSectionModal(section) {
  state.editingSection = section;
  const modal = $('#section-modal');
  const f = modal.querySelector('form');

  $('#section-modal-title').textContent = `Editar: ${sectionLabel(section.section_type)}`;
  f.is_enabled.checked = section.is_enabled;
  f.background_color.value = section.background_color || '#000000';
  f.text_color.value = section.text_color || '#000000';
  f.heading_font.value = section.heading_font || '';
  f.body_font.value = section.body_font || '';
  f.font_size.value = section.font_size || '';
  f.padding_y.value = section.padding_y ?? 80;

  // Campos de contenido según el tipo
  const fieldsEl = $('#section-content-fields');
  fieldsEl.innerHTML = '';
  contentFieldsFor(section.section_type).forEach(field => {
    const label = document.createElement('label');
    label.className = field.full ? 'full' : '';
    label.innerHTML = `
      <span>${field.label}</span>
      ${field.type === 'textarea'
        ? `<textarea name="content_${field.key}" rows="2">${escapeHtml(section.content?.[field.key] || '')}</textarea>`
        : `<input type="${field.type || 'text'}" name="content_${field.key}"
                  value="${escapeHtml(section.content?.[field.key] ?? '')}"
                  ${field.min != null ? `min="${field.min}"` : ''}
                  ${field.max != null ? `max="${field.max}"` : ''} />`
      }
      ${field.help ? `<small>${field.help}</small>` : ''}
    `;
    fieldsEl.appendChild(label);
  });

  modal.showModal();
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
      { key: 'quote', label: 'Frase / cita', full: true, type: 'textarea' }
    ],
    countdown: common,
    rsvp: [...common, { key: 'button_text', label: 'Texto del botón' }],
    calendar: [
      ...common,
      { key: 'button_text', label: 'Texto del botón' },
      { key: 'duration_hours', label: 'Duración (horas)', type: 'number', min: 1, max: 24 }
    ],
    gallery: common
  })[type] || [];
}

$('#section-modal .modal__close').addEventListener('click', () => $('#section-modal').close());
$('#section-modal [data-action="close"]').addEventListener('click', () => $('#section-modal').close());

$$('#section-modal [data-clear]').forEach(btn => {
  btn.addEventListener('click', () => {
    const f = $('#section-modal form');
    f[btn.dataset.clear].value = '';
  });
});

$('#section-modal form').addEventListener('submit', async e => {
  // Si fue cerrado con boton "Guardar" (default submit)
  if (e.submitter && e.submitter.dataset.action === 'close') return;
  e.preventDefault();
  const f = e.target;
  const section = state.editingSection;
  const fd = new FormData(f);

  // Reconstruir content
  const content = { ...(section.content || {}) };
  for (const [key, value] of fd.entries()) {
    if (key.startsWith('content_')) {
      const k = key.replace('content_', '');
      content[k] = isNaN(value) || value === '' ? value : Number(value);
      // mantener strings como strings cuando deberían serlo
      if (['title','subtitle','eyebrow','quote','button_text'].includes(k)) {
        content[k] = value;
      }
    }
  }

  const update = {
    is_enabled: f.is_enabled.checked,
    background_color: f.background_color.value || null,
    text_color: f.text_color.value || null,
    heading_font: f.heading_font.value || null,
    body_font: f.body_font.value || null,
    font_size: f.font_size.value ? Number(f.font_size.value) : null,
    padding_y: f.padding_y.value ? Number(f.padding_y.value) : 80,
    content
  };

  // Si los colores son '#000000' por default y no se tocaron, mejor limpiarlos
  // (en este caso simple los enviamos tal cual; el usuario puede usar "Limpiar")

  const { error } = await supabase.from('sections')
    .update(update).eq('id', section.id);
  if (error) { toast(error.message, 'error'); return; }

  Object.assign(section, update);
  renderSectionsList();
  $('#section-modal').close();
  toast('Sección actualizada');
});

// ============================================================
// GALERÍA
// ============================================================
function renderGalleryList() {
  const ul = $('#gallery-list');
  ul.innerHTML = '';
  state.currentGallery.forEach(img => {
    const li = document.createElement('li');
    li.className = 'gallery-img-item';
    li.innerHTML = `
      <img src="${storageUrl(img.image_url)}" alt="${escapeHtml(img.alt_text)}" />
      <button type="button" class="gallery-img-item__remove" aria-label="Eliminar imagen">×</button>
      <div class="gallery-img-item__body">
        <input type="text" data-field="alt_text" placeholder="Texto alternativo (obligatorio)"
               value="${escapeHtml(img.alt_text)}" required />
        <input type="text" data-field="caption" placeholder="Pie de foto (opcional)"
               value="${escapeHtml(img.caption || '')}" />
      </div>
    `;
    li.querySelector('.gallery-img-item__remove').addEventListener('click', () => removeGalleryImage(img));

    // Auto-guardar al cambiar
    li.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', async () => {
        const field = input.dataset.field;
        await supabase.from('gallery_images')
          .update({ [field]: input.value }).eq('id', img.id);
        img[field] = input.value;
      });
    });

    ul.appendChild(li);
  });
}

$('#gallery-upload-input').addEventListener('change', async e => {
  const files = [...e.target.files];
  if (!files.length) return;

  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${state.currentInvitation.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET).upload(path, file);
    if (upErr) { toast(upErr.message, 'error'); continue; }

    const { data, error } = await supabase.from('gallery_images').insert({
      invitation_id: state.currentInvitation.id,
      image_url: path,
      alt_text: 'Foto del evento',
      position: state.currentGallery.length
    }).select().single();
    if (error) { toast(error.message, 'error'); continue; }
    state.currentGallery.push(data);
  }
  renderGalleryList();
  e.target.value = '';
  toast(`${files.length} imagen(es) subida(s)`);
});

async function removeGalleryImage(img) {
  if (!confirm('¿Eliminar esta imagen?')) return;
  // Eliminar de storage si la ruta es relativa
  if (img.image_url && !img.image_url.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKET).remove([img.image_url]);
  }
  await supabase.from('gallery_images').delete().eq('id', img.id);
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
  const { error } = await supabase.from('invitations')
    .update({ is_published: newState }).eq('id', inv.id);
  if (error) { toast(error.message, 'error'); return; }
  inv.is_published = newState;
  updateEditorHeader();
  await loadInvitations();
  toast(newState ? 'Invitación publicada ✓' : 'Invitación despublicada');
});

$('#delete-btn').addEventListener('click', async () => {
  const inv = state.currentInvitation;
  if (!confirm(`¿Eliminar definitivamente la invitación "${inv.host_names}"?\nEsta acción no se puede deshacer.`)) return;
  await supabase.from('invitations').delete().eq('id', inv.id);
  state.currentInvitation = null;
  $('#editor').hidden = true;
  $('#empty-state').hidden = false;
  await loadInvitations();
  toast('Invitación eliminada');
});

// Vista previa de foto hero al seleccionar
$('#form-general [name="hero_image"]').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('#hero-preview').src = ev.target.result;
    $('#hero-preview').hidden = false;
  };
  reader.readAsDataURL(file);
});

// ============================================================
// INICIO
// ============================================================
checkAuth();
