# Invitaciones Dinámicas

Landing page configurable para invitaciones de eventos (bodas, cumpleaños, quinceañeras, etc.). Cada invitación se gestiona desde un panel de administración: secciones, orden, colores, tipografías e imágenes son editables por evento.

## Stack

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sin frameworks, sin build step)
- **Base de datos + Auth + Storage**: Supabase
- **Hosting**: Cloudflare Pages (servido directamente desde GitHub)

## Estructura

```
.
├── public/                  ← se sirve como sitio público
│   ├── index.html           ← landing de la invitación
│   ├── css/styles.css
│   └── js/
│       ├── config.js        ← URL + anon key de Supabase
│       └── app.js
├── admin/                   ← panel de administración (ruta /admin/)
│   ├── index.html
│   ├── admin.css
│   └── admin.js
└── supabase/
    └── schema.sql           ← ejecutar en SQL Editor de Supabase
```

## Despliegue paso a paso

### 1. Supabase

1. Crear un nuevo proyecto en https://supabase.com
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`. Esto crea las tablas, índices, triggers, políticas RLS y un evento de demo.
3. Ir a **Storage** y crear un bucket llamado `invitations` con acceso **público**.
4. Ir a **Authentication → Users** y crear el usuario administrador (email + password).
5. Copiar **Project URL** y **anon public key** desde Project Settings → API.

### 2. Configurar credenciales

Editar `public/js/config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL:  'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...',
  STORAGE_BUCKET: 'invitations',
  DEFAULT_SLUG: 'demo'
};
```

> La **anon key** es segura de exponer: las políticas RLS controlan qué puede leer/escribir. Nunca pongas la `service_role` key.

### 3. GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/invitaciones.git
git push -u origin main
```

### 4. Cloudflare Pages

1. En el dashboard de Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**
2. Seleccionar el repo `invitaciones`.
3. Configuración del build:
   - **Framework preset**: None
   - **Build command**: *(vacío)*
   - **Build output directory**: `/` (raíz)
4. Deploy.

> No hay paso de build porque es HTML/CSS/JS plano. Cloudflare sirve los archivos directamente.

### 5. Rutas amigables (opcional)

Para que la URL `/i/[slug]` funcione, agregar el archivo `public/_redirects` (Cloudflare lo respeta automáticamente):

```
/i/*  /index.html  200
```

Esto ya está incluido en `public/_redirects`.

## Uso del panel admin

- URL: `https://tu-dominio.pages.dev/admin/`
- Iniciar sesión con el usuario creado en Supabase.
- Crear una invitación nueva con el botón **+ Nueva** (se genera con 5 secciones por defecto).
- En las pestañas:
  - **General**: anfitriones, fecha, foto hero, link RSVP, ubicación
  - **Tema**: colores, fuentes, tamaño base
  - **Secciones**: activar/desactivar, reordenar (drag), personalizar contenidos y estilos individuales
  - **Galería**: subir/eliminar imágenes, editar `alt` y caption
- Botón **Publicar**: hace visible la invitación en `/i/[slug]`.

## URL de cada invitación

```
https://tu-dominio.pages.dev/i/boda-ana-y-luis
https://tu-dominio.pages.dev/?i=boda-ana-y-luis   ← alternativa con query string
```

## Buenas prácticas implementadas

- **Semántica HTML**: `<main>`, `<section>`, `<article>`, `<figure>`, `<footer>`, headings jerárquicos.
- **Accesibilidad**:
  - Skip-link al contenido principal
  - `aria-live` en contador y mensajes
  - `aria-modal` y manejo de teclado en lightbox
  - `alt` obligatorio en todas las imágenes de galería
  - Foco visible y `:focus-visible`
  - Respeto a `prefers-reduced-motion`
- **Responsivo**: layout fluido con `clamp()`, breakpoints en 768px y 380px
- **Performance**: lazy loading de imágenes, preconnect a Google Fonts, sin librerías pesadas
- **Seguridad**: políticas RLS en Supabase, solo invitaciones `is_published = true` son visibles
- **SEO/social**: meta tags Open Graph dinámicos según la invitación

## Notas

- La galería usa `IntersectionObserver` para revelar las secciones al hacer scroll.
- El botón de calendario genera tanto un link a Google Calendar como un `.ics` descargable (Apple/Outlook).
- El contador soporta `countdown_target` separado de `event_date` por si se quiere mostrar otro objetivo.
- Para producción, mover los selectores de fuente a una lista canónica si se quiere garantizar que todas las opciones estén precargadas en `index.html`.
