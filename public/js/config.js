// ============================================================
// CONFIG · Credenciales públicas de Supabase
// ============================================================
// La "anon key" es SEGURA de exponer en el cliente:
// las políticas RLS de Supabase controlan qué puede leer/escribir.
// NUNCA pongas aquí la "service_role" key.
// ============================================================

window.APP_CONFIG = {
  SUPABASE_URL:  'https://dtcplkdfanzcgopmghzz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y3Bsa2RmYW56Y2dvcG1naHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzM3OTAsImV4cCI6MjA5NTE0OTc5MH0.iqR4-By8fvCKaft_-6W8WEWR5FcwGTAKWE3B5jPDCNo',
  STORAGE_BUCKET: 'invitations',
  DEFAULT_SLUG: 'demo'   // Slug cuando no se especifica en la URL
};
