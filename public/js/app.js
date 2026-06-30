const _debug = location.hostname === 'localhost' || location.search.includes('debug=1');
const dbg = (...a) => _debug && console.log(...a);

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

/** Carga una fuente de Google Fonts dinámicamente si no está ya cargada */
const loadedSectionFonts = new Set();
function loadSectionFont(fontName) {
  if (!fontName || loadedSectionFonts.has(fontName)) return;
  loadedSectionFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g,'+')}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// ============================================================
// MOTOR DE PARTÍCULAS
// ============================================================
function initParticles(el, effect, intensity) {
  if (!effect || effect === 'none') return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;';
  el.style.position = 'relative';

  // Insertar DESPUÉS del overlay/bg-img para no tapar la imagen de fondo
  const overlay = el.querySelector('.hero__overlay');
  const bgWrap  = el.querySelector('.section-bg-wrap');
  const anchor  = overlay || bgWrap;
  if (anchor && anchor.nextSibling) {
    el.insertBefore(canvas, anchor.nextSibling);
  } else {
    el.appendChild(canvas);
  }

  // Asegurar que el contenido quede encima del canvas
  el.querySelectorAll(':scope > *:not(canvas):not(.section-bg-wrap):not(.hero__bg-img):not(.hero__overlay)').forEach(child => {
    if (!child.style.zIndex) child.style.zIndex = '4';
  });

  const ctx = canvas.getContext('2d');
  const count = Math.round(intensity); // 10-100

  function resize() {
    canvas.width  = el.offsetWidth  || window.innerWidth;
    canvas.height = el.offsetHeight || window.innerHeight;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  let particles = [];
  const W = () => canvas.width;
  const H = () => canvas.height;

  // ── Generadores por efecto ──
  const generators = {
    stars: () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      r: Math.random() * 1.8 + .4,
      a: Math.random(),
      da: (.004 + Math.random() * .012) * (Math.random() < .5 ? 1 : -1),
      color: ['#f5d060','#ffe8a0','#fff8dc','#ffd700'][Math.floor(Math.random()*4)]
    }),
    confetti: () => {
      const cols = ['#f472b6','#60a5fa','#34d399','#fbbf24','#a78bfa','#fb7185','#38bdf8'];
      return {
        x: Math.random() * W(), y: -20 - Math.random() * H(),
        w: 5 + Math.random() * 7, h: 3 + Math.random() * 4,
        r: Math.random() * Math.PI * 2,
        vx: (Math.random() - .5) * 1.5,
        vy: .8 + Math.random() * 2,
        vr: .03 + Math.random() * .08,
        color: cols[Math.floor(Math.random() * cols.length)]
      };
    },
    bubbles: () => ({
      x: Math.random() * W(), y: H() + Math.random() * H() * .5,
      r: 4 + Math.random() * 14,
      vy: .2 + Math.random() * .6,
      vx: (Math.random() - .5) * .4,
      a: .2 + Math.random() * .4
    }),
    petals: () => {
      const cols = ['#fda4af','#f9a8d4','#fbcfe8','#fecdd3','#f0abfc'];
      return {
        x: Math.random() * W(), y: -20 - Math.random() * H() * .5,
        size: 4 + Math.random() * 9,
        r: Math.random() * Math.PI * 2,
        vr: .015 + Math.random() * .04,
        vy: .4 + Math.random() * 1.2,
        swing: Math.random() * Math.PI * 2,
        vswing: .02 + Math.random() * .03,
        color: cols[Math.floor(Math.random() * cols.length)]
      };
    },
    snow: () => ({
      x: Math.random() * W(), y: -10 - Math.random() * H() * .3,
      r: .5 + Math.random() * 2.5,
      vy: .15 + Math.random() * .7,
      vx: (Math.random() - .5) * .3,
      a: .4 + Math.random() * .6,
      color: ['#c4b5fd','#e9d5ff','#ddd6fe','#ffffff'][Math.floor(Math.random()*4)]
    }),
    fireflies: () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      tx: Math.random() * W(), ty: Math.random() * H(),
      a: Math.random(), da: .015 + Math.random() * .025,
      speed: .25 + Math.random() * .5,
      color: ['#fde68a','#fef08a','#fcd34d'][Math.floor(Math.random()*3)]
    })
  };

  // ── Updaters por efecto ──
  const updaters = {
    stars: p => {
      p.a += p.da;
      if (p.a >= 1 || p.a <= 0) p.da *= -1;
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      return false;
    },
    confetti: p => {
      p.y += p.vy; p.x += p.vx; p.r += p.vr;
      ctx.globalAlpha = .85;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      return p.y > H() + 20;
    },
    bubbles: p => {
      p.y -= p.vy; p.x += p.vx;
      ctx.globalAlpha = p.a;
      ctx.strokeStyle = 'rgba(100,180,255,.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.stroke();
      return p.y < -p.r;
    },
    petals: p => {
      p.y += p.vy; p.swing += p.vswing; p.r += p.vr;
      p.x += Math.sin(p.swing) * .8;
      ctx.globalAlpha = .8;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size*.45, 0, 0, Math.PI*2);
      ctx.fill(); ctx.restore();
      return p.y > H() + 20;
    },
    snow: p => {
      p.y += p.vy; p.x += p.vx;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      return p.y > H() + 10;
    },
    fireflies: p => {
      p.a += p.da;
      if (p.a >= 1 || p.a <= 0) {
        p.da *= -1;
        if (p.a <= 0) { p.tx = Math.random()*W(); p.ty = Math.random()*H(); }
      }
      p.x += (p.tx - p.x) * p.speed * .018;
      p.y += (p.ty - p.y) * p.speed * .018;
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      return false;
    }
  };

  const gen = generators[effect];
  const upd = updaters[effect];
  if (!gen || !upd) return;

  particles = Array.from({ length: count }, gen);

  let alive = true;
  let rafId = null;

  function tick() {
    if (!alive) { rafId = null; return; }
    ctx.clearRect(0, 0, W(), H());
    ctx.globalAlpha = 1;
    for (let i = particles.length - 1; i >= 0; i--) {
      const dead = upd(particles[i]);
      if (dead) particles[i] = gen();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(tick);
  }

  // Parar/reanudar según visibilidad (ahorro de CPU)
  const io = new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (visible && !alive) {
      alive = true;
      tick();
    } else if (!visible) {
      alive = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }, { threshold: 0.01 });
  io.observe(el);

  // Iniciar siempre — el observer ajustará si sale del viewport
  tick();
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
  dbg('[Landing] Buscando invitación:', slug);

  const { data: invitation, error } = await supabaseClient
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  dbg('[Landing] Invitación:', { invitation, error });
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

  dbg('[Landing] Secciones:', sectionsRes);
  dbg('[Landing] Galería:', galleryRes);

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
}

function applySectionStyles(el, section, nextSection) {
  if (section.background_color) el.style.setProperty('--section-bg', section.background_color);
  if (section.text_color)        el.style.setProperty('--section-color', section.text_color);
  if (section.heading_font) {
    el.style.setProperty('--section-heading-font', `'${section.heading_font}', Georgia, serif`);
    loadSectionFont(section.heading_font);
  }
  if (section.body_font) {
    el.style.setProperty('--section-body-font', `'${section.body_font}', system-ui, sans-serif`);
    loadSectionFont(section.body_font);
  }
  if (section.font_size)         el.style.setProperty('--section-font-size', `${section.font_size}px`);
  if (section.padding_y != null) el.style.setProperty('--section-padding-y', `${section.padding_y}px`);

  // Altura minima — soporta px y 100vh
  if (section.min_height) {
    const h = String(section.min_height);
    el.style.minHeight = (h.includes('vh') || h.includes('%')) ? h : `${parseInt(h)}px`;
  }

  // Imagen de fondo — solo si esta sección tiene la suya propia
  if (section.bg_image_url) {
    const url = storageUrl(section.bg_image_url);
    const overlay = Math.min(Math.max(parseFloat(section.bg_overlay) || 0, 0), 1);
    const blur    = Math.min(Math.max(parseFloat(section.bg_blur)    || 0, 0), 20);

    // El hero tiene su propio sistema fullscreen
    if (section.section_type === 'hero') {
      const bgImgEl = el.querySelector('.hero__bg-img img');
      if (bgImgEl) {
        bgImgEl.src = url;
        bgImgEl.alt = '';
        if (blur > 0) { bgImgEl.style.filter = `blur(${blur}px)`; bgImgEl.style.transform = 'scale(1.08)'; }
      }
      const heroOverlay = el.querySelector('.hero__overlay');
      if (heroOverlay && overlay > 0) heroOverlay.style.background = `rgba(0,0,0,${overlay})`;
    } else {
      // Div aislado para otras secciones
      const bgWrap = document.createElement('div');
      bgWrap.setAttribute('aria-hidden','true');
      bgWrap.className = 'section-bg-wrap';
      bgWrap.style.cssText = 'position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;';
      const bgDiv = document.createElement('div');
      bgDiv.style.cssText = `position:absolute;inset:${blur>0?`-${blur*2}px`:'0'};background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat;${blur>0?`filter:blur(${blur}px);`:''}`;
      bgWrap.appendChild(bgDiv);
      if (overlay > 0) {
        const ov = document.createElement('div');
        ov.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,${overlay});`;
        bgWrap.appendChild(ov);
      }
      el.style.position = 'relative';
      el.style.isolation = 'isolate';
      el.insertBefore(bgWrap, el.firstChild);
      el.querySelectorAll(':scope > *:not(.section-bg-wrap)').forEach(child => {
        child.style.position = 'relative'; child.style.zIndex = '1';
      });
    }
  }

  // Efecto de movimiento
  const motion = section.motion_effect || 'none';
  if (motion !== 'none') applyMotionEffect(el, motion);

  // Transicion superior
  const topTransition = section.top_transition || 'none';
  if (topTransition !== 'none') {
    const currentBg = section.background_color || getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#faf7f2';
    el.style.position = 'relative'; el.style.overflow = 'hidden';
    el.style.paddingTop = `calc(${section.padding_y || 80}px + 64px)`;
    const topSvg = buildTransitionSVG(topTransition, currentBg, 'top');
    if (topSvg) el.insertBefore(topSvg, el.firstChild);
  }

  // Transicion inferior
  const transition = section.bottom_transition || 'none';
  if (transition !== 'none') {
    let nextBg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#faf7f2';
    if (nextSection) nextBg = (nextSection.bg_image_url && !nextSection.background_color) ? nextBg : (nextSection.background_color || nextBg);
    el.style.position = 'relative'; el.style.overflow = 'hidden';
    el.style.paddingBottom = `calc(${section.padding_y || 80}px + 64px)`;
    const svgEl = buildTransitionSVG(transition, nextBg);
    if (svgEl) el.appendChild(svgEl);
  }
}

/** Genera el SVG de transición en la parte superior o inferior de la sección */
function buildTransitionSVG(type, fillColor, position = 'bottom') {
  const wrap = document.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');

  const isTop = position === 'top';
  wrap.style.cssText = [
    'position:absolute',
    isTop ? 'top:-1px' : 'bottom:-1px',
    'left:0',
    'width:100%',
    'line-height:0',
    'overflow:hidden',
    'z-index:4',
    'pointer-events:none',
    isTop ? 'transform:rotate(180deg)' : '',
  ].filter(Boolean).join(';');

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
    // El parallax se aplica al div interno de imagen, no al section
    const bgDiv = el.querySelector('.section-bg-wrap div');
    if (bgDiv) {
      const speed = effect === 'parallax-fast' ? 0.6 : 0.3;
      el.dataset.parallaxSpeed = speed;
      el.classList.add('has-parallax');
    } else {
      // Sin imagen de fondo — aplicar al section directamente
      el.style.backgroundAttachment = 'fixed';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center center';
      el.dataset.parallaxSpeed = effect === 'parallax-fast' ? 0.6 : 0.3;
      el.classList.add('has-parallax');
    }

  } else if (effect === 'zoom-bg') {
    // Zoom en el div interno de imagen
    const bgDiv = el.querySelector('.section-bg-wrap div');
    if (bgDiv) {
      bgDiv.style.animation = 'zoom-bg-anim 14s ease-in-out infinite alternate';
      bgDiv.style.inset = '-8%';
    }
    el.classList.add('motion-zoom-bg');

  } else if (effect === 'float') {
    const inner = el.querySelector('.section__inner') || el;
    inner.classList.add('motion-float');

  } else if (effect === 'pulse-soft') {
    const inner = el.querySelector('.section__inner') || el;
    inner.classList.add('motion-pulse');

  } else {
    // Efectos de entrada al scroll
    el.classList.add('has-reveal', 'motion-entry', `motion-${effect}`);
    el.style.opacity = '0';
  }
}

// Aplica tamaño de texto si está configurado en content
function applyFieldSize(el, selector, sizeValue) {
  if (!sizeValue) return;
  const target = el.querySelector(selector);
  if (target) target.style.fontSize = sizeValue;
}

function applyContentSizes(el, content) {
  applyFieldSize(el, '[data-field="title"]',       content.title_size);
  applyFieldSize(el, '[data-field="subtitle"]',    content.subtitle_size);
  applyFieldSize(el, '[data-field="eyebrow"]',     content.eyebrow_size);
  applyFieldSize(el, '[data-field="quote"]',       content.quote_size);
  applyFieldSize(el, '[data-field="button_text"]', content.button_text_size);
  applyFieldSize(el, '[data-field="tagline"]',     content.tagline_size);
  applyFieldSize(el, '[data-field="address"]',     content.address_size);
  applyFieldSize(el, '[data-field="host_names"]',  content.host_names_size);
  applyFieldSize(el, '[data-field="event_date"]',  content.event_date_size);
}

function renderHero(el, inv, content, section) {
  const eyebrowEl = el.querySelector('[data-field="event_type"]');
  if (content.eyebrow) {
    eyebrowEl.textContent = content.eyebrow;
  } else if (content.eyebrow === undefined && inv.event_type) {
    eyebrowEl.textContent = inv.event_type.replace(/_/g, ' ');
  } else {
    eyebrowEl.hidden = true;
  }
  el.querySelector('[data-field="host_names"]').textContent = inv.host_names;
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="event_date"]').textContent = formatDate(inv.event_date);
  el.querySelector('[data-field="quote"]').textContent = content.quote || '';

  // ── Posición del contenido ──
  const heroContent = el.querySelector('.hero__content');
  const pos = content.text_position || 'center';

  // Reset completo
  el.style.alignItems = 'center';
  heroContent.style.marginTop = '';
  heroContent.style.marginBottom = '';
  heroContent.style.alignItems = 'center';
  heroContent.style.textAlign = 'center';
  heroContent.style.paddingTop = 'var(--space-xl)';
  heroContent.style.paddingBottom = 'var(--space-xl)';
  heroContent.style.paddingLeft = 'var(--space-md)';
  heroContent.style.paddingRight = 'var(--space-md)';

  // Aplicar posición usando margin-top/bottom auto (más confiable que justify-content)
  switch (pos) {
    case 'bottom-center':
      heroContent.style.marginTop    = 'auto';
      heroContent.style.alignItems   = 'center';
      heroContent.style.textAlign    = 'center';
      heroContent.style.paddingBottom = '3.5rem';
      heroContent.style.paddingTop   = '1rem';
      break;
    case 'bottom-left':
      heroContent.style.marginTop    = 'auto';
      heroContent.style.alignItems   = 'flex-start';
      heroContent.style.textAlign    = 'left';
      heroContent.style.paddingBottom = '3.5rem';
      heroContent.style.paddingTop   = '1rem';
      heroContent.style.paddingLeft  = '2rem';
      el.style.alignItems = 'flex-start';
      break;
    case 'bottom-right':
      heroContent.style.marginTop    = 'auto';
      heroContent.style.alignItems   = 'flex-end';
      heroContent.style.textAlign    = 'right';
      heroContent.style.paddingBottom = '3.5rem';
      heroContent.style.paddingTop   = '1rem';
      heroContent.style.paddingRight = '2rem';
      el.style.alignItems = 'flex-end';
      break;
    case 'top-center':
      heroContent.style.marginBottom = 'auto';
      heroContent.style.alignItems   = 'center';
      heroContent.style.textAlign    = 'center';
      heroContent.style.paddingTop   = '3.5rem';
      heroContent.style.paddingBottom = '1rem';
      break;
    case 'top-left':
      heroContent.style.marginBottom = 'auto';
      heroContent.style.alignItems   = 'flex-start';
      heroContent.style.textAlign    = 'left';
      heroContent.style.paddingTop   = '3.5rem';
      heroContent.style.paddingBottom = '1rem';
      heroContent.style.paddingLeft  = '2rem';
      el.style.alignItems = 'flex-start';
      break;
    default: // center
      break;
  }

  // ── Tamaño del nombre ──
  const titleEl = el.querySelector('[data-field="host_names"]');
  const sizes = { normal: 'clamp(3.5rem,11vw,8rem)', large: 'clamp(4.5rem,14vw,10rem)', xlarge: 'clamp(5.5rem,17vw,13rem)' };
  titleEl.style.fontSize = sizes[content.text_size || 'normal'];

  // ── Peso del texto ──
  const weights = { light: '300', normal: '400', bold: '700' };
  titleEl.style.fontWeight = weights[content.text_weight || 'light'];

  // Overlay más oscuro en la parte donde está el texto para legibilidad
  const overlay = el.querySelector('.hero__overlay');
  if (overlay && pos.startsWith('bottom')) {
    overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)';
  } else if (overlay && pos.startsWith('top')) {
    overlay.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)';
  }

  // ── Imagen de fondo ──
  const imageUrl = section?.bg_image_url ? storageUrl(section.bg_image_url) : null;
  const bgImgEl = el.querySelector('[data-field="hero_image_bg"]');
  const bgWrap  = el.querySelector('.hero__bg-img');
  if (imageUrl) {
    bgImgEl.src = imageUrl;
    bgImgEl.alt = `Foto de ${inv.host_names}`;
    const blur = Math.min(Math.max(parseFloat(section.bg_blur) || 0, 0), 20);
    if (blur > 0) { bgImgEl.style.filter = `blur(${blur}px)`; bgImgEl.style.transform = 'scale(1.08)'; }
    const ov = Math.min(Math.max(parseFloat(section.bg_overlay) || 0, 0), 1);
    if (overlay && ov > 0) overlay.style.background = `rgba(0,0,0,${ov})`;
  } else {
    if (bgWrap) bgWrap.style.display = 'none';
    if (overlay) overlay.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)';
  }

  applyContentSizes(el, content);
}

function renderCountdown(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Cuenta regresiva';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';

  const units    = el.querySelectorAll('.countdown__unit');
  const nums     = el.querySelectorAll('.countdown__num');
  const labels   = el.querySelectorAll('.countdown__label');
  const boxStyle = content.box_style || 'square';

  // Estilos de cuadro
  const styleMap = {
    square:  'border-radius:0; box-shadow:none; border:1px solid var(--color-border,rgba(0,0,0,.1));',
    rounded: 'border-radius:16px; box-shadow:none; border:1px solid var(--color-border,rgba(0,0,0,.1));',
    bevel:   'border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.06); border:none;',
    circle:  'border-radius:50%; aspect-ratio:1; border:1px solid var(--color-border,rgba(0,0,0,.1)); box-shadow:none;',
    minimal: 'background:transparent !important; border:none; box-shadow:none; padding:0;',
    none:    'background:transparent !important; border:none; box-shadow:none; padding:0.5rem 0;',
  };
  const css = styleMap[boxStyle] || styleMap.square;
  units.forEach(u => u.style.cssText += ';' + css);

  // Tamaño de los números
  if (content.num_size) {
    nums.forEach(n => n.style.fontSize = content.num_size);
  }

  // Tamaño y color de las etiquetas (DÍAS, HORAS, etc.)
  labels.forEach(l => {
    if (content.label_size)  l.style.fontSize = content.label_size;
    if (content.label_color && content.label_color !== '#000000') {
      l.style.color = content.label_color;
    }
  });

  const target   = new Date(inv.countdown_target || inv.event_date).getTime();
  const finished = el.querySelector('.countdown__finished');
  const cdEl     = el.querySelector('.countdown');

  function tick() {
    const now  = Date.now();
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
  if (tick()) {
    const intervalId = setInterval(tick, 1000);
    const observer = new MutationObserver(() => {
      if (!el.isConnected) { clearInterval(intervalId); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function applyBtnColors(btn, content) {
  if (!btn) return;
  const bg    = content.button_bg    || '';
  const color = content.button_color || '';
  const bgH   = content.button_bg_hover    || '';
  const colorH= content.button_color_hover || '';
  if (bg)    btn.style.background = bg;
  if (color) btn.style.color = color;
  if (bgH || colorH) {
    btn.addEventListener('mouseenter', () => {
      if (bgH)    btn.style.background = bgH;
      if (colorH) btn.style.color = colorH;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = bg || '';
      btn.style.color = color || '';
    });
  }
}

function renderRsvp(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Confirma tu asistencia';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="button_text"]').textContent = content.button_text || 'Confirmar';
  const link = el.querySelector('[data-field="rsvp_link"]');
  link.href = inv.rsvp_form_url || '#';
  if (!inv.rsvp_form_url) link.setAttribute('aria-disabled', 'true');
  applyBtnColors(link, content);
  applyContentSizes(el, content);
}

function renderCalendar(el, inv, content) {
  el.querySelector('[data-field="title"]').textContent = content.title || 'Guarda la fecha';
  el.querySelector('[data-field="subtitle"]').textContent = content.subtitle || '';
  el.querySelector('[data-field="button_text"]').textContent = content.button_text || 'Agregar al calendario';

  const icalLink = el.querySelector('[data-action="add-ical"]');
  icalLink.hidden = !content.show_ics;

  const googleBtn = el.querySelector('[data-action="add-google"]');
  applyBtnColors(googleBtn, content);

  const start = new Date(inv.event_date);
  const durationH = Number(content.duration_hours) || 4;
  const end = new Date(start.getTime() + durationH * 3600 * 1000);
  const title = `${inv.event_title} - ${inv.host_names}`;
  const location = inv.calendar_location || '';
  const description = inv.calendar_description || '';

  googleBtn.addEventListener('click', () => {
    const fmt = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', title);
    url.searchParams.set('dates', `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set('details', description);
    url.searchParams.set('location', location);
    window.open(url.toString(), '_blank', 'noopener');
  });

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

function createGalleryFigure(img, i, images, eager) {
  const figure = document.createElement('figure');
  figure.className = 'gallery__item';
  figure.tabIndex = 0;
  figure.setAttribute('role', 'button');
  figure.setAttribute('aria-label', `Ver imagen: ${img.alt_text || `foto ${i+1}`}`);
  figure.dataset.index = i;

  const imgEl = document.createElement('img');
  imgEl.alt = img.alt_text || '';
  imgEl.decoding = 'async';
  imgEl.style.transition = 'opacity .4s ease';

  if (eager) {
    imgEl.src = storageUrl(img.image_url);
    imgEl.loading = 'eager';
  } else {
    // Lazy: cargar solo cuando entra al viewport
    imgEl.src = '';
    imgEl.dataset.src = storageUrl(img.image_url);
    imgEl.loading = 'lazy';
    imgEl.style.opacity = '0';
    imgEl.style.backgroundColor = 'var(--color-border)';

    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      imgEl.src = imgEl.dataset.src;
      imgEl.onload = () => { imgEl.style.opacity = '1'; };
      io.disconnect();
    }, { rootMargin: '200px 0px' });
    io.observe(imgEl);
  }

  if (img.caption) {
    const cap = document.createElement('figcaption');
    cap.className = 'gallery__caption';
    cap.textContent = img.caption;
    figure.appendChild(imgEl);
    figure.appendChild(cap);
  } else {
    figure.appendChild(imgEl);
  }

  figure.addEventListener('click', () => openLightbox(images, i));
  figure.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(images, i); }
  });
  return figure;
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

  images.forEach((img, i) => {
    const eager = i < 3; // Las primeras 3 cargan de inmediato
    const figure = createGalleryFigure(img, i, images, eager);
    if (layout === 'featured') {
      figure.className = i === 0
        ? 'gallery__item gallery__item--featured'
        : 'gallery__item gallery__item--thumb';
    }
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

function renderLocation(el, inv, content) {
  const eyebrow = el.querySelector('[data-field="eyebrow"]');
  eyebrow.textContent = content.eyebrow || '¿Dónde?';

  el.querySelector('[data-field="title"]').textContent =
    content.title || inv.calendar_location || 'Ubicación';

  const addrEl = el.querySelector('[data-field="address"]');
  const address = content.address || inv.calendar_location || '';
  addrEl.textContent = address;

  const mapHeight = content.map_height || 380;
  const mapHeightMobile = content.map_height_mobile || Math.min(mapHeight, 260);
  el.style.setProperty('--map-height', `${mapHeight}px`);
  el.style.setProperty('--map-height-mobile', `${mapHeightMobile}px`);

  const iframe = el.querySelector('[data-field="map-iframe"]');
  if (content.map_url) {
    iframe.src = content.map_url;
  } else if (address) {
    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;
  } else {
    el.querySelector('.location__map-wrap').hidden = true;
  }

  const dirLink = el.querySelector('[data-field="directions-link"]');
  if (address) {
    dirLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    // Texto del botón — usar el span dedicado
    const textSpan = dirLink.querySelector('[data-field="directions-text"]');
    if (textSpan) textSpan.textContent = content.button_label || 'Cómo llegar';
    // Colores del botón
    applyBtnColors(dirLink, content);
  } else {
    dirLink.hidden = true;
  }
  applyContentSizes(el, content);
}

function buildColImage(item) {
  if (!item.image_url) return '';
  // Tamaño configurable — por defecto 100% del ancho del contenedor
  const size = item.image_size || '100%';
  // Si el valor tiene unidad relativa (vw, %) aplica al width; si es px aplica max-width
  const isRelative = size.includes('vw') || size === '100%' || size.includes('%');
  const style = isRelative
    ? `width:${size};max-width:100%;`
    : `width:${size};max-width:100%;`;
  return `<figure class="col__image-wrap" style="${style}">
    <img src="${storageUrl(item.image_url)}" alt="" class="col__image" loading="lazy" decoding="async" />
  </figure>`;
}

function renderFooter(el, inv, content) {
  // Hosts
  const hostsEl = el.querySelector('[data-field="hosts"]');
  hostsEl.textContent = inv.host_names || '';
  hostsEl.hidden = content.show_hosts === false;

  // Evento (tipo + título)
  const eventEl = el.querySelector('[data-field="event"]');
  const eventTxt = [inv.event_type?.replace(/_/g,' '), inv.event_title].filter(Boolean).join(' · ');
  eventEl.textContent = eventTxt;
  eventEl.hidden = content.show_event === false || !eventTxt;

  // Fecha
  const dateEl = el.querySelector('[data-field="date"]');
  dateEl.textContent = formatDate(inv.event_date);
  dateEl.hidden = content.show_date === false;

  // Tagline
  const tagEl = el.querySelector('[data-field="tagline"]');
  const tagText = content.tagline !== undefined ? content.tagline : 'Invitación digital';
  tagEl.textContent = tagText;
  tagEl.hidden = !tagText;

  // Logo Vylo — con link opcional
  const brandEl = el.querySelector('[data-field="brand"]');
  brandEl.hidden = content.show_logo === false;
  if (content.vylo_link && !brandEl.hidden) {
    const img = brandEl.querySelector('img');
    const link = document.createElement('a');
    link.href = content.vylo_link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Vylo — invitaciones digitales');
    link.appendChild(img.cloneNode());
    brandEl.innerHTML = '';
    brandEl.appendChild(link);
  }
}

function renderInfo(el, inv, content) {
  const titleEl = el.querySelector('[data-field="title"]');
  const subtitleEl = el.querySelector('[data-field="subtitle"]');
  if (content.title) { titleEl.textContent = content.title; titleEl.hidden = false; }
  if (content.subtitle) { subtitleEl.textContent = content.subtitle; subtitleEl.hidden = false; }

  const cols = el.querySelector('[data-field="columns"]');
  const items = content.columns || [];
  items.forEach(item => {
    const pos = item.image_position || 'top';
    const imgHtml = buildColImage(item);

    const div = document.createElement('div');
    div.className = `info__col ${item.image_url ? `info__col--img-${pos}` : ''}`;

    const textDiv = document.createElement('div');
    textDiv.className = 'col__text-content';

    if (item.icon)  { const p = document.createElement('div'); p.className = 'info__icon'; p.setAttribute('aria-hidden','true'); p.textContent = item.icon; textDiv.appendChild(p); }
    if (item.label) { const p = document.createElement('p'); p.className = 'info__col-label'; p.textContent = item.label; if (item.label_size) p.style.fontSize = item.label_size; textDiv.appendChild(p); }
    if (item.title) { const p = document.createElement('p'); p.className = 'info__col-title'; p.textContent = item.title; if (item.title_size) p.style.fontSize = item.title_size; textDiv.appendChild(p); }
    if (item.text)  { const p = document.createElement('p'); p.className = 'info__col-text';  p.textContent = item.text;  if (item.text_size)  p.style.fontSize = item.text_size;  textDiv.appendChild(p); }

    const imgEl = imgHtml ? (() => { const d = document.createElement('div'); d.innerHTML = imgHtml; return d.firstElementChild; })() : null;

    if (pos === 'top')    { if (imgEl) div.appendChild(imgEl); div.appendChild(textDiv); }
    else if (pos === 'bottom') { div.appendChild(textDiv); if (imgEl) div.appendChild(imgEl); }
    else if (pos === 'left')   { if (imgEl) div.appendChild(imgEl); div.appendChild(textDiv); }
    else if (pos === 'right')  { div.appendChild(textDiv); if (imgEl) div.appendChild(imgEl); }
    else { div.appendChild(textDiv); }

    cols.appendChild(div);
  });
  applyContentSizes(el, content);
}

function renderGift(el, inv, content) {
  const titleEl = el.querySelector('[data-field="title"]');
  const subtitleEl = el.querySelector('[data-field="subtitle"]');
  if (content.title) { titleEl.textContent = content.title; titleEl.hidden = false; }
  else { titleEl.hidden = true; }
  if (content.subtitle) { subtitleEl.textContent = content.subtitle; subtitleEl.hidden = false; }
  else { subtitleEl.hidden = true; }

  const cols = el.querySelector('[data-field="gift-columns"]');
  const items = content.columns || [];

  items.forEach(item => {
    const pos = item.image_position || 'top';
    const imgHtml = buildColImage(item);
    const div = document.createElement('div');
    div.className = `gift__col ${item.image_url ? `gift__col--img-${pos}` : ''}`;

    let textHtml = `
      ${item.icon  ? `<div class="gift__icon" aria-hidden="true">${item.icon}</div>` : ''}
      ${item.label ? `<p class="gift__label">${item.label}</p>` : ''}
      ${item.title ? `<p class="gift__col-title">${item.title}</p>` : ''}
      ${item.text  ? `<p class="gift__col-text">${item.text}</p>` : ''}
    `;

    if (item.alias) {
      textHtml += `
        <div class="gift__alias-wrap" role="button" tabindex="0" aria-label="Copiar alias ${item.alias}">
          <span class="gift__alias">${item.alias}</span>
          <button type="button" class="gift__copy-btn" aria-label="Copiar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      `;
    }

    if (pos === 'left' || pos === 'right') {
      div.innerHTML = pos === 'left' ? imgHtml + textHtml : textHtml + imgHtml;
    } else {
      div.innerHTML = pos === 'top' ? imgHtml + textHtml : textHtml + imgHtml;
    }

    if (item.alias) {
      const aliasWrap = div.querySelector('.gift__alias-wrap');
      aliasWrap.addEventListener('click', () => triggerAliasCopy(item.alias, item.mp_redirect, item.mp_alias));
      aliasWrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') triggerAliasCopy(item.alias, item.mp_redirect, item.mp_alias);
      });
    }

    cols.appendChild(div);
  });
}

// Modal de alias copiado
let aliasModalTimer = null;

function triggerAliasCopy(alias, mpRedirect, mpAlias) {
  // Copiar al portapapeles
  navigator.clipboard?.writeText(alias).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = alias; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });

  const modal = document.getElementById('alias-modal');
  const redirectEl = modal.querySelector('.alias-modal__redirect');
  const countEl = modal.querySelector('.alias-modal__count');
  const cancelBtn = modal.querySelector('.alias-modal__cancel');
  const textEl = modal.querySelector('.alias-modal__text');

  textEl.textContent = `El alias "${alias}" fue copiado al portapapeles.`;

  if (mpRedirect) {
    redirectEl.hidden = false;
    let count = 3;
    countEl.textContent = count;
    if (aliasModalTimer) clearInterval(aliasModalTimer);
    aliasModalTimer = setInterval(() => {
      count--;
      countEl.textContent = count;
      if (count <= 0) {
        clearInterval(aliasModalTimer);
        closeAliasModal();
        // Abrir Mercado Pago
        const mpUrl = mpAlias
          ? `https://mpago.la/pay/${encodeURIComponent(mpAlias)}`
          : 'https://www.mercadopago.com.ar/';
        // Mobile: intenta abrir la app, fallback a web
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = `mercadopago://pay?alias=${encodeURIComponent(mpAlias || alias)}`;
          setTimeout(() => window.open(mpUrl, '_blank'), 1500);
        } else {
          window.open(mpUrl, '_blank', 'noopener');
        }
      }
    }, 1000);
  } else {
    redirectEl.hidden = true;
    if (aliasModalTimer) clearInterval(aliasModalTimer);
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  cancelBtn.onclick = closeAliasModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeAliasModal(); }, { once: true });
}

function closeAliasModal() {
  if (aliasModalTimer) { clearInterval(aliasModalTimer); aliasModalTimer = null; }
  document.getElementById('alias-modal').hidden = true;
  document.body.style.overflow = '';
}

const RENDERERS = {
  hero:      renderHero,
  countdown: renderCountdown,
  rsvp:      renderRsvp,
  calendar:  renderCalendar,
  gallery:   renderGallery,
  location:  renderLocation,
  info:      renderInfo,
  gift:      renderGift,
  footer:    renderFooter,
};

// ============================================================
// PREVIEW EN VIVO — postMessage desde el admin
// ============================================================
window.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'vylo-preview') return;

  const { section, invitation, gallery } = e.data;
  if (!section || !invitation) return;

  // Barra indicadora
  let bar = document.getElementById('preview-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'preview-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#f59e0b;color:#000;font-size:11px;font-weight:700;text-align:center;padding:4px 0;letter-spacing:.05em;text-transform:uppercase;pointer-events:none';
    bar.textContent = '\u{1F441} VISTA PREVIA';
    document.body.prepend(bar);
  }

  // Buscar el nodo existente de esta sección
  // Estrategia 1: por data-section-id (exacto)
  let target = document.querySelector(`[data-section-id="${section.id}"]`);

  // Estrategia 2: por posición — section.position es el índice en el container
  if (!target) {
    const container = document.getElementById('sections-container');
    const footerCont = document.getElementById('footer-container');
    const cont = section.section_type === 'footer' ? footerCont : container;
    if (cont) {
      const nodes = Array.from(cont.children);
      // Buscar el nodo que corresponde al tipo de sección
      const byType = nodes.filter(n => n.dataset.section === section.section_type);
      if (byType.length === 1) target = byType[0];
      else if (section.position !== undefined && nodes[section.position]) target = nodes[section.position];
    }
  }

  if (!target) {
    dbg('[Preview] No se encontró el nodo para:', section.section_type, section.id);
    return;
  }

  // Crear nuevo nodo con los datos del preview
  const tpl = document.getElementById(`tpl-${section.section_type}`);
  if (!tpl) return;

  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.sectionId = section.id;
  node.dataset.section   = section.section_type;

  // Aplicar estilos y renderizar
  if (section.section_type !== 'footer') applySectionStyles(node, section, null);

  const renderer = RENDERERS[section.section_type];
  if (renderer) {
    if (section.section_type === 'gallery')   renderer(node, invitation, section.content || {}, gallery || []);
    else if (section.section_type === 'hero') renderer(node, invitation, section.content || {}, section);
    else                                       renderer(node, invitation, section.content || {});
  }

  // Siempre visible en preview
  node.classList.add('is-visible');
  node.style.opacity = '1';
  node.style.transform = 'none';

  // Reemplazar
  target.replaceWith(node);

  // Scroll suave hacia la sección
  setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
});


function renderSections({ invitation, sections, gallery }) {
  const container      = document.getElementById('sections-container');
  const footerContainer = document.getElementById('footer-container');
  dbg('[Landing] Renderizando', sections.length, 'secciones');

  sections.forEach((section, idx) => {
    try {
      dbg('[Landing] Renderizando sección:', section.section_type);
      const tpl = document.getElementById(`tpl-${section.section_type}`);
      if (!tpl) {
        console.warn('[Landing] Template no encontrado para:', section.section_type);
        return;
      }

      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.sectionId = section.id;
      node.dataset.section   = section.section_type; // asegurar siempre presente

      // El footer va en su propio contenedor, al final
      const isFooter = section.section_type === 'footer';
      const target = isFooter ? footerContainer : container;

      if (!isFooter) {
        const nextSection = sections[idx + 1] || null;
        applySectionStyles(node, section, nextSection);
        if (section.particle_effect && section.particle_effect !== 'none') {
          initParticles(node, section.particle_effect, section.particle_intensity || 50);
        }
      }

      const renderer = RENDERERS[section.section_type];
      if (renderer) {
        if (section.section_type === 'gallery') {
          renderer(node, invitation, section.content || {}, gallery);
        } else if (section.section_type === 'hero') {
          renderer(node, invitation, section.content || {}, section);
        } else {
          renderer(node, invitation, section.content || {});
        }
      }
      target.appendChild(node);
      dbg('[Landing] Sección OK:', section.section_type);
    } catch(e) {
      console.error('[Landing] Error en sección', section.section_type, ':', e);
    }
  });

  // IntersectionObserver — solo anima secciones con has-reveal o motion-entry
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('motion-entry')) {
        el.classList.add('motion-entry--visible');
      } else if (el.classList.contains('has-reveal')) {
        el.classList.add('is-visible');
      }
      // Sin clase de animación → ya es visible, no hacer nada
      io.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.section').forEach(s => io.observe(s));

  // Avisar al padre (admin iframe) que la landing está lista para recibir preview
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'vylo-ready' }, '*');
  }

  // Parallax scroll handler
  const parallaxSections = document.querySelectorAll('.has-parallax');
  if (parallaxSections.length) {
    const handleParallax = () => {
      parallaxSections.forEach(el => {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallaxSpeed) || 0.3;
        const offset = (rect.top * speed).toFixed(2);
        // Intentar mover el div interno primero
        const bgDiv = el.querySelector('.section-bg-wrap div');
        if (bgDiv) {
          bgDiv.style.transform = `translateY(${offset}px)`;
        } else {
          el.style.backgroundPositionY = `calc(50% + ${offset}px)`;
        }
      });
    };
    window.addEventListener('scroll', handleParallax, { passive: true });
    handleParallax();
  }
}

// ---- Inicio ----

// SEGURO ANTI-LOADER: si en 10 segundos no cargó, mostrar error
const loaderTimeout = setTimeout(() => {
  const loader = document.getElementById('loader');
  const errorState = document.getElementById('error-state');
  if (loader && !loader.hidden) {
    console.error('[Landing] Timeout: el loader tardó más de 10s. Mostrando error.');
    loader.hidden = true;
    if (errorState) errorState.hidden = false;
  }
}, 10000);

function hideLoader() {
  clearTimeout(loaderTimeout);
  const loader = document.getElementById('loader');
  if (loader) loader.hidden = true;
}

function showError() {
  hideLoader();
  const errorState = document.getElementById('error-state');
  if (errorState) errorState.hidden = false;
}

function showMain() {
  hideLoader();
  const main = document.getElementById('main');
  if (main) main.hidden = false;
}

async function init() {
  dbg('[Landing] Iniciando...');
  try {
    setupLightbox();
    const slug = getSlug();
    const data = await fetchInvitation(slug);

    if (!data) {
      dbg('[Landing] No se encontró la invitación o no está publicada');
      showError();
      return;
    }

    dbg('[Landing] Aplicando tema...');
    applyTheme(data.invitation);

    dbg('[Landing] Renderizando secciones:', data.sections.length);
    renderSections(data);

    dbg('[Landing] ¡Listo!');
    showMain();

  } catch(err) {
    console.error('[Landing] Error en init:', err.message);
    console.error('[Landing] Stack:', err.stack);
    showError();
  }
}

// Captura global de errores no manejados
window.addEventListener('error', (e) => {
  console.error('[Landing] Error global:', e.message, e.filename, e.lineno);
  showError();
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Landing] Promise rechazada:', e.reason);
  showError();
});

init();

}); // fin DOMContentLoaded
