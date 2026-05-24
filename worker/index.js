// ============================================================
// VYLO SHORT LINKS — Cloudflare Worker
// ============================================================
// Rutas:
//   GET  /s/:code        → redirecciona a la invitación
//   GET  /s/:code/stats  → devuelve estadísticas (JSON)
// ============================================================

const SUPABASE_URL  = 'https://dtcplkdfanzcgopmghzz.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y3Bsa2RmYW56Y2dvcG1naHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzM3OTAsImV4cCI6MjA5NTE0OTc5MH0.iqR4-By8fvCKaft_-6W8WEWR5FcwGTAKWE3B5jPDCNo';
const SITE_BASE     = 'https://vylo-50s.pages.dev/public';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Solo manejar /s/...
    if (!path.startsWith('/s/')) {
      return new Response('Not found', { status: 404 });
    }

    const parts = path.split('/').filter(Boolean); // ['s', 'code', ?'stats']
    const code  = parts[1];
    const isStats = parts[2] === 'stats';

    if (!code) return new Response('Code missing', { status: 400 });

    // Buscar el código en Supabase
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/short_links?code=eq.${encodeURIComponent(code)}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    const data = await res.json();
    if (!data.length) {
      return new Response('Link no encontrado', { status: 404 });
    }

    const link = data[0];

    // Endpoint de estadísticas
    if (isStats) {
      return new Response(JSON.stringify({
        code:       link.code,
        clicks:     link.clicks,
        created_at: link.created_at,
        target:     buildTarget(link),
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Incrementar contador de clicks (fire & forget)
    fetch(
      `${SUPABASE_URL}/rest/v1/short_links?id=eq.${link.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
      }
    );

    // Redirigir
    const target = buildTarget(link);
    return Response.redirect(target, 302);
  }
};

function buildTarget(link) {
  if (link.target_url) return link.target_url;
  if (link.invitation_id) {
    // Buscar el slug — por ahora usamos el invitation_id como fallback
    // El admin guarda el slug directamente en target_url al crear el link
    return `${SITE_BASE}/?i=${link.invitation_id}`;
  }
  return SITE_BASE;
}
