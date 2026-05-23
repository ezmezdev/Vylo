// ============================================================
// CONFIG · Credenciales públicas de Supabase
// ============================================================
// La "anon key" es SEGURA de exponer en el cliente:
// las políticas RLS de Supabase controlan qué puede leer/escribir.
// NUNCA pongas aquí la "service_role" key.
// ============================================================

window.APP_CONFIG = {
  SUPABASE_URL:  'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU-ANON-KEY-AQUI',
  STORAGE_BUCKET: 'invitations',
  DEFAULT_SLUG: 'demo'   // Slug cuando no se especifica en la URL
};
