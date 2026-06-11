// ============================================================
// VYLO SHORT LINKS — Cloudflare Worker
// ============================================================
// Configurar secrets en Cloudflare Dashboard:
//   Workers & Pages → vylo-short-links → Settings → Variables
//   Agregar como "Secret":
//     SUPABASE_URL  = https://dtcplkdfanzcgopmghzz.supabase.co
//     SUPABASE_KEY  = eyJhbGci... (la anon key)
// ============================================================

const SITE_BASE = 'https://vylo-50s.pages.dev/public';

export default {
  async fetch(request, env) {
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_KEY = env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response('Worker mal configurado: faltan secrets SUPABASE_URL y SUPABASE_KEY', { status: 500 });
    }

    const url  = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith('/s/')) {
      return new Response('Not found', { status: 404 });
    }

    const parts  = path.split('/').filter(Boolean);
    const code   = parts[1];
    const isStats = parts[2] === 'stats';

    if (!code) return new Response('Code missing', { status: 400 });

    // Cache en Cloudflare KV o Cache API para evitar siempre llamar a Supabase
    const cacheKey = `vylo-link-${code}`;
    const cache    = caches.default;
    const cached   = await cache.match(new Request(`https://cache.vylo/${cacheKey}`));

    let link;
    if (cached && !isStats) {
      link = await cached.json();
    } else {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/short_links?code=eq.${encodeURIComponent(code)}&select=*`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      if (!data.length) return new Response('Link no encontrado', { status: 404 });
      link = data[0];

      // Cachear por 5 minutos
      const cacheRes = new Response(JSON.stringify(link), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
      });
      await cache.put(new Request(`https://cache.vylo/${cacheKey}`), cacheRes);
    }

    if (isStats) {
      return new Response(JSON.stringify({
        code:       link.code,
        clicks:     link.clicks,
        created_at: link.created_at,
        target:     link.target_url,
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Incrementar clicks (fire & forget)
    fetch(`${SUPABASE_URL}/rest/v1/short_links?id=eq.${link.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
    });

    return Response.redirect(link.target_url || SITE_BASE, 302);
  }
};
