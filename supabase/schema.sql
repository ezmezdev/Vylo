-- ============================================================
-- SCHEMA SUPABASE - Sistema de Invitaciones Dinámicas
-- ============================================================
-- Ejecutar en: SQL Editor de Supabase
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- TABLA: invitations (configuración principal de cada evento)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,             -- URL amigable: /i/boda-ana-y-luis
  event_type TEXT NOT NULL,              -- 'boda' | 'cumpleanos' | 'quinceanera' | 'bautismo' | 'otro'
  host_names TEXT NOT NULL,              -- "Ana & Luis" o "María"
  event_title TEXT NOT NULL,             -- "Nuestra Boda" / "Mis XV Años"
  event_date TIMESTAMPTZ NOT NULL,       -- Fecha y hora del evento
  countdown_target TIMESTAMPTZ,          -- Fecha objetivo del contador (puede diferir)
  hero_image_url TEXT,                   -- Foto principal de los anfitriones
  rsvp_form_url TEXT,                    -- Link al Google Form
  calendar_location TEXT,                -- Ubicación para el evento de calendario
  calendar_description TEXT,             -- Descripción para el evento de calendario
  -- Tema global (overridable por sección)
  primary_color TEXT DEFAULT '#1a1a1a',
  background_color TEXT DEFAULT '#faf7f2',
  accent_color TEXT DEFAULT '#c9a961',
  heading_font TEXT DEFAULT 'Cormorant Garamond',
  body_font TEXT DEFAULT 'Manrope',
  base_font_size INTEGER DEFAULT 16,     -- en px
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: sections (cada sección habilitable/configurable)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,            -- 'hero' | 'countdown' | 'rsvp' | 'calendar' | 'gallery' | 'custom'
  is_enabled BOOLEAN DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,   -- Orden de aparición
  -- Overrides de estilo (NULL = hereda del tema global)
  background_color TEXT,
  text_color TEXT,
  heading_font TEXT,
  body_font TEXT,
  font_size INTEGER,                     -- en px
  padding_y INTEGER DEFAULT 80,          -- padding vertical en px
  -- Contenido flexible por tipo (JSON)
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sections_invitation ON sections(invitation_id);
CREATE INDEX IF NOT EXISTS idx_sections_position ON sections(invitation_id, position);
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);

-- ------------------------------------------------------------
-- TABLA: gallery_images (libro de fotos personalizable)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  alt_text TEXT NOT NULL,                -- Obligatorio para accesibilidad
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_invitation ON gallery_images(invitation_id, position);

-- ------------------------------------------------------------
-- STORAGE: Bucket para imágenes
-- ------------------------------------------------------------
-- Ejecutar manualmente en Supabase Storage:
-- 1. Crear bucket público llamado 'invitations'
-- 2. Estructura: /invitations/{invitation_id}/hero.jpg, /gallery/*.jpg

-- ------------------------------------------------------------
-- FUNCIONES: actualizar updated_at automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sections_updated_at ON sections;
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Lectura pública SOLO para invitaciones publicadas
CREATE POLICY "Public read published invitations"
  ON invitations FOR SELECT
  USING (is_published = true);

CREATE POLICY "Public read sections of published invitations"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.id = sections.invitation_id
      AND invitations.is_published = true
    )
  );

CREATE POLICY "Public read gallery of published invitations"
  ON gallery_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.id = gallery_images.invitation_id
      AND invitations.is_published = true
    )
  );

-- Escritura: solo usuarios autenticados (admins)
CREATE POLICY "Authenticated users full access invitations"
  ON invitations FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access sections"
  ON sections FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access gallery"
  ON gallery_images FOR ALL
  USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- DATOS DE EJEMPLO (opcional, comentar en producción)
-- ------------------------------------------------------------
INSERT INTO invitations (
  slug, event_type, host_names, event_title, event_date, countdown_target,
  rsvp_form_url, calendar_location, calendar_description,
  primary_color, background_color, accent_color
) VALUES (
  'demo',
  'boda',
  'Ana & Luis',
  'Nuestra Boda',
  '2026-12-15 18:00:00+00',
  '2026-12-15 18:00:00+00',
  'https://forms.gle/ejemplo',
  'Hacienda Los Olivos, Mendoza, Argentina',
  'Ceremonia y celebración. ¡Te esperamos!',
  '#2c2416', '#f5efe6', '#b08968'
) ON CONFLICT (slug) DO NOTHING;

-- Insertar las 5 secciones por defecto para el demo
WITH demo AS (SELECT id FROM invitations WHERE slug = 'demo')
INSERT INTO sections (invitation_id, section_type, position, content)
SELECT demo.id, st.type, st.pos, st.content::jsonb FROM demo, (VALUES
  ('hero', 0, '{"subtitle":"Acompáñanos en este día tan especial","quote":"El amor es la poesía de los sentidos"}'),
  ('countdown', 1, '{"title":"Cuenta regresiva","subtitle":"Falta para el gran día"}'),
  ('rsvp', 2, '{"title":"Confirma tu asistencia","subtitle":"Por favor, hazlo antes del 1 de diciembre","button_text":"Confirmar ahora"}'),
  ('calendar', 3, '{"title":"Guarda la fecha","subtitle":"Agrega el evento a tu calendario","button_text":"Agregar al calendario"}'),
  ('gallery', 4, '{"title":"Nuestros recuerdos","subtitle":"Momentos que nos trajeron hasta aquí"}')
) AS st(type, pos, content)
ON CONFLICT DO NOTHING;
