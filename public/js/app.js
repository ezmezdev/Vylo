// ============================================================
// INVITACIONES DINÁMICAS · APP PRINCIPAL
// ============================================================

const { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET, DEFAULT_SLUG } = window.APP_CONFIG;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {

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
  console.log('[Landing] Buscando invitación:', slug);

  const { data: invitation, error } = await supabaseClient
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  console.log('[Landing] Invitación:', { invitation, error });
  if (error || !invitation) return null;

  const [sectionsRes, galleryRes] = await Promise.all([
    supabaseClient.from('sections')
      .select('*')
      .eq('invitation_id', invitation.id)
      .eq('is_enabled', true)
      .order('position', { ascending: true }),
    supabaseClient.from('gallery_images')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('position', { ascending: true })
  ]);

  console.log('[Landing] Secciones:', sectionsRes);
  console.log('[Landing] Galería:', galleryRes);

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

function applySectionStyles(el, section, nextSection) {
  if (section.background_color) el.style.setProperty('--section-bg', section.background_color);
  if (section.text_color)        el.style.setProperty('--section-color', section.text_color);
  if (section.heading_font)      el.style.setProperty('--section-heading-font', `'${section.heading_font}'`);
  if (section.body_font)         el.style.setProperty('--section-body-font', `'${section.body_font}'`);
  if (section.font_size)         el.style.setProperty('--section-font-size', `${section.font_size}px`);
  if (section.padding_y != null) el.style.setProperty('--section-padding-y', `${section.padding_y}px`);
  if (section.min_height)        el.style.minHeight = `${section.min_height}px`;

  // ── Imagen de fondo aislada por sección ──────────────────────
  // Se usa un <div> absoluto para que NO afecte otras secciones.
  // La imagen, el blur y el overlay viven todos dentro de ese div.
  if (section.bg_image_url) {
    const url = storageUrl(section.bg_image_url);
    const overlay = Math.min(Math.max(parseFloat(section.bg_overlay) || 0, 0), 1);
    const blur    = Math.min(Math.max(parseFloat(section.bg_blur)    || 0, 0), 20);

    // Contenedor aislado de fondo
    const bgWrap = document.createElement('div');
    bgWrap.setAttribute('aria-hidden', 'true');
    bgWrap.className = 'section-bg-wrap';
    bgWrap.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    `;

    // La imagen en sí (con blur aplicado solo a ella)
    const bgImg = document.createElement('div');
    bgImg.style.cssText = `
      position: absolute;
      inset: ${blur > 0 ? `-${blur * 2}px` : '0'};
      background-image: url('${url}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      ${blur > 0 ? `filter: blur(${blur}px);` : ''}
    `;
    bgWrap.appendChild(bgImg);

    // Overlay de color/opacidad (encima de la imagen, debajo del contenido)
    if (overlay > 0) {
      const ov = document.createElement('div');
      ov.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,${overlay});
      `;
      bgWrap.appendChild(ov);
    }

    // Insertar el wrap como primer hijo y posicionar la sección
    el.style.position = 'relative';
    el.style.isolation = 'isolate';
    el.insertBefore(bgWrap, el.firstChild);

    // Asegurar que todo el contenido quede encima del fondo
    el.querySelectorAll(':scope > *:not(.section-bg-wrap)').forEach(child => {
      child.style.position = 'relative';
      child.style.zIndex = '1';
    });
  }

  // Efecto de movimiento
  const motion = section.motion_effect || 'none';
  if (motion !== 'none') applyMotionEffect(el, motion);

  // Transición inferior entre secciones
  // Transición inferior entre secciones
  const transition = section.bottom_transition || 'none';
  if (transition !== 'none') {
    // Color del SVG = fondo de la sección siguiente (lo que hay "debajo")
    let nextBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg').trim() || '#faf7f2';

    if (nextSection) {
      // Si la siguiente tiene imagen, intentar usar su background_color
      // Si no tiene ninguno, usar el global
      nextBg = (nextSection.bg_image_url && !nextSection.background_color)
        ? nextBg
        : (nextSection.background_color || nextBg);
    }

    // El SVG va DENTRO de la sección con overflow:hidden
    // Se posiciona en la parte inferior y tapa el borde
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    // Padding extra para que el contenido no quede tapado por el SVG (60px de alto)
    const currentPadding = parseInt(el.style.getPropertyValue('--section-padding-y') || '80');
    el.style.paddingBottom = `calc(${section.padding_y || 80}px + 64px)`;

    const svgEl = buildTransitionSVG(transition, nextBg);
    if (svgEl) el.appendChild(svgEl);
  }
}

/** Genera el SVG de transición en la parte inferior de la sección */
function buildTransitionSVG(type, fillColor) {
  const wrap = document.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = [
    'position:absolute',
    'bottom:-1px',
    'left:0',
    'width:100%',
    'line-height:0',
    'overflow:hidden',
    'z-index:4',
    'pointer-events:none',
  ].join(';');

  const shapes = {
    'curve-down':  `<path d="M0,0 C360,80 1080,80 1440,0 L1440,80 L0,80 Z"/>`,
    'curve-up':    `<path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z"/>`,
    'wave':        `<path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"/>`,
    'wave-double': `<path d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1350,60 1440,40 L1440,80 L0,80 Z"/>`,
    'slant-right': `<polygon points="0,80 1440,0 1440,80"/>`,
    'slant-left':  `<polygon points="0,0 1440,80 0,80"/>`,
    'triangle':    `<polygon points="0,80 720,0 1440,80"/>`,
    'zigzag':      `<polyline points="0,80 120,20 240,80 360,20 480,80 600,20 720,80 840,20 960,80 1080,20 1200,80 1320,20 1440,80 1440,80 0,80"/>`,
  };

  const shape = shapes[type];
  if (!shape) return null;

  wrap.innerHTML = `
    <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg"
         preserveAspectRatio="none"
         style="display:block;width:100%;height:64px">
      <g fill="${fillColor}">${shape}</g>
    </svg>`;
  return wrap;
}

function applyMotionEffect(el, effect) {
  if (effect === 'parallax' || effect === 'parallax-fast') {
    el.style.backgroundAttachment = 'fixed';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center center';
    const speed = effect === 'parallax-fast' ? 0.5 : 0.25;
    el.dataset.parallaxSpeed = speed;
    el.classList.add('has-parallax');
  } else if (effect === 'zoom-bg') {
    el.classList.add('motion-zoom-bg');
  } else if (effect === 'float') {
    const inner = el.querySelector('.section__inner') || el;
    inner.classList.add('motion-float');
  } else if (effect === 'pulse-soft') {
    const inner = el.querySelector('.section__inner') || el;
    inner.classList.add('motion-pulse');
  } else {
    el.classList.add('motion-entry', `motion-${effect}`);
    el.style.opacity = '0';
  }
}
  el.querySelector('[data-field="event_type"]').textContent =
    content.eyebrow || inv.event_type.replace(/_/g, ' ');
  el.querySelector('[data-field="host_names"]').textContent = inv.host_names;
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="event_date"]').textContent = formatDate(inv.event_date);
  el.querySelector('[data-field="quote"]').textContent = content.quote || '';

  // Imagen como fondo fullscreen
  const bgImg = el.querySelector('[data-field="hero_image_bg"]');
  if (inv.hero_image_url) {
    bgImg.src = storageUrl(inv.hero_image_url);
    bgImg.alt = `Foto de ${inv.host_names}`;
  } else {
    // Sin foto: fondo con gradiente usando colores del tema
    el.querySelector('.hero__bg-img').style.display = 'none';
    el.querySelector('.hero__overlay').style.background =
      `linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, var(--color-accent)) 100%)`;
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

  // Mostrar/ocultar botón .ics
  const icalLink = el.querySelector('[data-action="add-ical"]');
  icalLink.hidden = !content.show_ics;

  const start = new Date(inv.event_date);
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

  // .ics descargable
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
  const layout = content.layout || 'masonry';
  grid.className = `gallery gallery--${layout}`;
  grid.dataset.layout = layout;

  if (!images.length) {
    grid.innerHTML = '<p class="gallery__empty">Próximamente compartiremos nuestras fotos.</p>';
    return;
  }

  if (layout === 'featured') {
    // Primera imagen grande, resto miniaturas
    images.forEach((img, i) => {
      const figure = document.createElement('figure');
      figure.className = i === 0 ? 'gallery__item gallery__item--featured' : 'gallery__item gallery__item--thumb';
      figure.tabIndex = 0;
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Ver imagen: ${img.alt_text}`);
      figure.innerHTML = `<img src="${storageUrl(img.image_url)}" alt="${img.alt_text}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" />`;
      figure.dataset.index = i;
      figure.addEventListener('click', () => openLightbox(images, i));
      figure.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(images, i); }});
      grid.appendChild(figure);
    });
  } else if (layout === 'horizontal') {
    images.forEach((img, i) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery__item';
      figure.tabIndex = 0;
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Ver imagen: ${img.alt_text}`);
      figure.innerHTML = `<img src="${storageUrl(img.image_url)}" alt="${img.alt_text}" loading="lazy" decoding="async" />`;
      figure.dataset.index = i;
      figure.addEventListener('click', () => openLightbox(images, i));
      figure.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(images, i); }});
      grid.appendChild(figure);
    });
  } else {
    images.forEach((img, i) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery__item';
      figure.tabIndex = 0;
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Ver imagen: ${img.alt_text}`);
      figure.innerHTML = `
        <img src="${storageUrl(img.image_url)}" alt="${img.alt_text}" loading="lazy" decoding="async" />
        ${img.caption ? `<figcaption class="gallery__caption">${img.caption}</figcaption>` : ''}
      `;
      figure.dataset.index = i;
      figure.addEventListener('click', () => openLightbox(images, i));
      figure.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(images, i); }});
      grid.appendChild(figure);
    });
  }
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
  console.log('[Landing] Renderizando', sections.length, 'secciones');

  sections.forEach((section, idx) => {
    try {
      console.log('[Landing] Renderizando sección:', section.section_type);
      const tpl = document.getElementById(`tpl-${section.section_type}`);
      if (!tpl) {
        console.warn('[Landing] Template no encontrado para:', section.section_type);
        return;
      }

      const node = tpl.content.firstElementChild.cloneNode(true);
      const nextSection = sections[idx + 1] || null;
      applySectionStyles(node, section, nextSection);

      const renderer = RENDERERS[section.section_type];
      if (renderer) {
        if (section.section_type === 'gallery') {
          renderer(node, invitation, section.content || {}, gallery);
        } else {
          renderer(node, invitation, section.content || {});
        }
      }
      container.appendChild(node);
      console.log('[Landing] Sección OK:', section.section_type);
    } catch(e) {
      console.error('[Landing] Error en sección', section.section_type, ':', e);
    }
  });

  // IntersectionObserver: maneja reveal base + efectos de entrada
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el.classList.contains('motion-entry')) {
          // Efecto de entrada animado
          el.classList.add('motion-entry--visible');
        } else {
          // Reveal base
          el.classList.add('is-visible');
        }
        io.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.section').forEach(s => io.observe(s));

  // Parallax scroll handler
  const parallaxSections = document.querySelectorAll('.has-parallax');
  if (parallaxSections.length) {
    const handleParallax = () => {
      parallaxSections.forEach(el => {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallaxSpeed) || 0.25;
        const offset = (rect.top * speed).toFixed(2);
        el.style.backgroundPositionY = `calc(50% + ${offset}px)`;
      });
    };
    window.addEventListener('scroll', handleParallax, { passive: true });
    handleParallax();
  }
}

// ---- Inicio ----

async function init() {
  console.log('[Landing] Iniciando...');
  try {
    setupLightbox();
    const slug = getSlug();
    const data = await fetchInvitation(slug);

    if (!data) {
      console.log('[Landing] No se encontró la invitación o no está publicada');
      document.getElementById('loader').hidden = true;
      document.getElementById('error-state').hidden = false;
      return;
    }

    console.log('[Landing] Aplicando tema...');
    applyTheme(data.invitation);

    console.log('[Landing] Renderizando secciones:', data.sections.length);
    renderSections(data);

    console.log('[Landing] Mostrando página');
    document.getElementById('loader').hidden = true;
    document.getElementById('main').hidden = false;
    console.log('[Landing] ¡Listo!');

  } catch(err) {
    console.error('[Landing] Error en init:', err);
    console.error('[Landing] Stack:', err.stack);
    document.getElementById('loader').hidden = true;
    document.getElementById('error-state').hidden = false;
  }
}

init();

}); // fin DOMContentLoaded
