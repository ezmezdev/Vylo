// ============================================================
// INVITACIONES DINÁMICAS · APP PRINCIPAL
// ============================================================
// Lee la invitación desde Supabase según el slug en la URL
// y renderiza las secciones habilitadas en el orden definido.
// ============================================================

const { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET, DEFAULT_SLUG } = window.APP_CONFIG;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Helpers ----

/** Obtiene el slug desde la URL: ?i=demo  o  /i/demo  */
function getSlug() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('i')) return params.get('i');
  const pathMatch = window.location.pathname.match(/\/i\/([^\/]+)/);
  if (pathMatch) return pathMatch[1];
  return DEFAULT_SLUG;
}

/** Formatea una fecha ISO para mostrar en español */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/** Construye URL pública del bucket de storage */
function storageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** Carga dinámicamente fuentes de Google */
function loadFonts(headingFont, bodyFont) {
  const fonts = new Set([headingFont, bodyFont].filter(Boolean));
  const families = [...fonts]
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&');
  document.getElementById('font-link').href =
    `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ---- Carga de datos ----

async function fetchInvitation(slug) {
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !invitation) return null;

  const [sectionsRes, galleryRes] = await Promise.all([
    supabase.from('sections')
      .select('*')
      .eq('invitation_id', invitation.id)
      .eq('is_enabled', true)
      .order('position', { ascending: true }),
    supabase.from('gallery_images')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('position', { ascending: true })
  ]);

  return {
    invitation,
    sections: sectionsRes.data || [],
    gallery: galleryRes.data || []
  };
}

// ---- Renderizado ----

function applyTheme(inv) {
  const r = document.documentElement.style;
  r.setProperty('--color-primary', inv.primary_color);
  r.setProperty('--color-bg', inv.background_color);
  r.setProperty('--color-accent', inv.accent_color);
  r.setProperty('--color-text', inv.primary_color);
  r.setProperty('--font-heading', `'${inv.heading_font}', Georgia, serif`);
  r.setProperty('--font-body', `'${inv.body_font}', system-ui, sans-serif`);
  r.setProperty('--font-base', `${inv.base_font_size}px`);

  loadFonts(inv.heading_font, inv.body_font);

  // Metadatos de la página
  const title = `${inv.event_title} · ${inv.host_names}`;
  document.getElementById('page-title').textContent = title;
  document.getElementById('og-title').content = title;
  document.getElementById('og-description').content =
    `Te invitamos a ${inv.event_title} el ${formatDate(inv.event_date)}`;
  if (inv.hero_image_url) {
    document.getElementById('og-image').content = storageUrl(inv.hero_image_url);
  }

  document.getElementById('footer-hosts').textContent = inv.host_names;
  document.getElementById('footer-event').textContent =
    `${inv.event_title} · ${formatDate(inv.event_date)}`;
}

function applySectionStyles(el, section) {
  if (section.background_color) el.style.setProperty('--section-bg', section.background_color);
  if (section.text_color)        el.style.setProperty('--section-color', section.text_color);
  if (section.heading_font)      el.style.setProperty('--section-heading-font', `'${section.heading_font}'`);
  if (section.body_font)         el.style.setProperty('--section-body-font', `'${section.body_font}'`);
  if (section.font_size)         el.style.setProperty('--section-font-size', `${section.font_size}px`);
  if (section.padding_y != null) el.style.setProperty('--section-padding-y', `${section.padding_y}px`);
}

function renderHero(el, inv, content) {
  el.querySelector('[data-field="event_type"]').textContent =
    content.eyebrow || inv.event_type.replace(/_/g, ' ');
  el.querySelector('[data-field="host_names"]').textContent = inv.host_names;
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="event_date"]').textContent = formatDate(inv.event_date);
  el.querySelector('[data-field="quote"]').textContent = content.quote || '';

  const img = el.querySelector('[data-field="hero_image"]');
  if (inv.hero_image_url) {
    img.src = storageUrl(inv.hero_image_url);
    img.alt = `Foto de ${inv.host_names}`;
  } else {
    el.querySelector('.hero__photo').hidden = true;
  }
}

function renderCountdown(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Cuenta regresiva';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';

  const target = new Date(inv.countdown_target || inv.event_date).getTime();
  const finished = el.querySelector('.countdown__finished');
  const cdEl = el.querySelector('.countdown');

  function tick() {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      cdEl.hidden = true;
      finished.hidden = false;
      return false;
    }
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    el.querySelector('[data-unit="days"]').textContent    = String(days).padStart(2, '0');
    el.querySelector('[data-unit="hours"]').textContent   = String(hours).padStart(2, '0');
    el.querySelector('[data-unit="minutes"]').textContent = String(minutes).padStart(2, '0');
    el.querySelector('[data-unit="seconds"]').textContent = String(seconds).padStart(2, '0');
    return true;
  }
  if (tick()) setInterval(tick, 1000);
}

function renderRsvp(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Confirma tu asistencia';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="button_text"]').textContent = content.button_text || 'Confirmar';
  const link = el.querySelector('[data-field="rsvp_link"]');
  link.href = inv.rsvp_form_url || '#';
  if (!inv.rsvp_form_url) link.setAttribute('aria-disabled', 'true');
}

function renderCalendar(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Guarda la fecha';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="button_text"]').textContent = content.button_text || 'Agregar al calendario';

  const start = new Date(inv.event_date);
  // Duración por defecto: 4 horas (configurable en content.duration_hours)
  const durationH = Number(content.duration_hours) || 4;
  const end = new Date(start.getTime() + durationH * 3600 * 1000);
  const title = `${inv.event_title} - ${inv.host_names}`;
  const location = inv.calendar_location || '';
  const description = inv.calendar_description || '';

  // Google Calendar
  el.querySelector('[data-action="add-google"]').addEventListener('click', () => {
    const fmt = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', title);
    url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set('details', description);
    url.searchParams.set('location', location);
    window.open(url.toString(), '_blank', 'noopener');
  });

  // .ics descargable (Apple, Outlook, etc.)
  const icalLink = el.querySelector('[data-action="add-ical"]');
  const fmtIcs = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Invitaciones//ES',
    'BEGIN:VEVENT',
    `UID:${inv.id}@invitaciones`,
    `DTSTAMP:${fmtIcs(new Date())}`,
    `DTSTART:${fmtIcs(start)}`,
    `DTEND:${fmtIcs(end)}`,
    `SUMMARY:${title.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${description.replace(/,/g, '\\,').replace(/\n/g, '\\n')}`,
    `LOCATION:${location.replace(/,/g, '\\,')}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  icalLink.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}

function renderGallery(el, inv, content, images) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Galería';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  const grid = el.querySelector('[data-field="gallery-grid"]');

  if (!images.length) {
    grid.innerHTML = '<p style="color:var(--color-muted);font-style:italic;">Próximamente compartiremos nuestras fotos.</p>';
    return;
  }
  images.forEach((img, i) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery__item';
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', `Ampliar imagen: ${img.alt_text}`);
    figure.innerHTML = `
      <img src="${storageUrl(img.image_url)}" alt="${img.alt_text}"
           loading="lazy" decoding="async" />
    `;
    figure.dataset.index = i;
    figure.addEventListener('click', () => openLightbox(images, i));
    figure.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(images, i); }
    });
    grid.appendChild(figure);
  });
}

// ---- Lightbox ----
let lightboxState = { images: [], index: 0 };

function openLightbox(images, index) {
  lightboxState = { images, index };
  updateLightbox();
  document.getElementById('lightbox').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}
function navLightbox(delta) {
  const { images, index } = lightboxState;
  lightboxState.index = (index + delta + images.length) % images.length;
  updateLightbox();
}
function updateLightbox() {
  const lb = document.getElementById('lightbox');
  const { images, index } = lightboxState;
  const img = images[index];
  lb.querySelector('.lightbox__img').src = storageUrl(img.image_url);
  lb.querySelector('.lightbox__img').alt = img.alt_text;
  lb.querySelector('.lightbox__caption').textContent = img.caption || '';
}

function setupLightbox() {
  const lb = document.getElementById('lightbox');
  lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  lb.querySelector('.lightbox__nav--prev').addEventListener('click', () => navLightbox(-1));
  lb.querySelector('.lightbox__nav--next').addEventListener('click', () => navLightbox(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });
}

// ---- Renderizado principal ----

const RENDERERS = {
  hero: renderHero,
  countdown: renderCountdown,
  rsvp: renderRsvp,
  calendar: renderCalendar,
  gallery: renderGallery
};

function renderSections({ invitation, sections, gallery }) {
  const container = document.getElementById('sections-container');

  sections.forEach(section => {
    const tpl = document.getElementById(`tpl-${section.section_type}`);
    if (!tpl) return; // tipo desconocido, lo saltamos

    const node = tpl.content.firstElementChild.cloneNode(true);
    applySectionStyles(node, section);

    const renderer = RENDERERS[section.section_type];
    if (renderer) {
      // Galería recibe imágenes adicionalmente
      if (section.section_type === 'gallery') {
        renderer(node, invitation, section.content || {}, gallery);
      } else {
        renderer(node, invitation, section.content || {});
      }
    }
    container.appendChild(node);
  });

  // Reveal con IntersectionObserver
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.section').forEach(s => io.observe(s));
}

// ---- Inicio ----

async function init() {
  setupLightbox();
  const slug = getSlug();
  const data = await fetchInvitation(slug);

  document.getElementById('loader').hidden = true;

  if (!data) {
    document.getElementById('error-state').hidden = false;
    return;
  }

  applyTheme(data.invitation);
  renderSections(data);
  document.getElementById('main').hidden = false;
}

init().catch(err => {
  console.error('Error al inicializar:', err);
  document.getElementById('loader').hidden = true;
  document.getElementById('error-state').hidden = false;
});
