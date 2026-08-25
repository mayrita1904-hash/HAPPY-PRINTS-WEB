# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción del proyecto

Sitio web de **Happy Prints** (Toluca, México) — catálogo y venta de productos personalizados (sublimación, DTF, playeras, tazas, sellos, offset/serigrafía, grabado láser, etc.). Cada producto se puede pedir de dos formas que **conviven**: el flujo clásico de siempre (se arma en el navegador y se envía como mensaje pre-llenado de **WhatsApp** vía `wa.me`) o, desde que se agregó el carrito de compras, pagando en línea con **Mercado Pago** a través de una cuenta de cliente (Mi Perfil / Mis Favoritos / Mi Carrito) — ver "Cuenta de cliente y carrito de compras" más abajo. Las categorías "de cotización" (sin precio fijo) solo tienen el flujo de WhatsApp.

- Tipo de proyecto: sitio estático (HTML/CSS/JS vanilla, sin frameworks ni build tools) + un puñado de funciones serverless de Vercel para analíticas propias y para el pago de cursos.
- Base de datos: **Supabase** (Postgres + Storage + Auth), consumida directo desde el cliente vía REST (`/rest/v1/...`), sin backend intermedio.
- Deploy: Vercel, auto-deploy al hacer push (detecta `package.json` y `/api` sin configuración extra).

## Estructura real del proyecto
```
/
├── index.html              # Home: catálogo, categorías, carrusel de destacados, modal de producto
├── admin.html               # Panel admin (CRUD de catálogo). No enlazado en el menú, protegido con Supabase Auth
├── dashboard.html            # Dashboard de analíticas. No enlazado en el menú, protegido con DASHBOARD_KEY
├── /pages
│   ├── experience.html      # Página de "Servicios"/paquetes de experiencia
│   ├── contenido-digital.html # Página de servicios de sitios web
│   ├── arma-tu-sitio-web.html # Calculadora de paquete de sitio web a la medida
│   └── cursos.html           # Cursos en línea: registro/login/recuperar contraseña + catálogo + pago (ver abajo)
├── /css/styles.css          # Única hoja de estilos del sitio público
├── /js
│   ├── main.js               # Toda la lógica del home: carga Supabase, catálogo, calculadora de precio,
│   │                          # editor de personalización, subida de archivos, mensaje de WhatsApp
│   ├── experience.js         # Carga los paquetes de la página de servicios
│   ├── cursos.js              # Auth de clientes (Supabase Auth), catálogo de cursos, inicia el pago con Mercado Pago
│   └── analytics.js          # Beacon de analíticas propias (ver abajo)
├── /api
│   ├── track.js              # Función serverless Vercel: recibe eventos de analytics.js, escribe en Redis
│   ├── stats.js               # Función serverless Vercel: agrega y expone las estadísticas (protegida por clave)
│   ├── mp-crear-preferencia.js # Crea la preferencia de pago de Mercado Pago para un curso (requiere sesión)
│   ├── mp-webhook.js           # Recibe la confirmación de pago de un curso y activa el acceso
│   ├── mp-crear-preferencia-pedido.js # Crea la preferencia de pago de Mercado Pago para un pedido del carrito
│   ├── mp-webhook-pedido.js     # Recibe la confirmación de pago de un pedido y actualiza su estatus
│   └── cp-colonias.js           # Proxy server-side a la API externa codigos.zip (colonias por C.P.)
├── /assets/images
├── supabase_*.sql             # Scripts SQL sueltos para correr manualmente en el editor SQL de Supabase
│                                # (RLS, tablas de galería, paquetes de experiencia, ítems de cotización, tallas,
│                                #  registro de cotizaciones, catálogo de cursos, inscripciones de cursos,
│                                #  perfiles/direcciones/favoritos/pedidos del carrito, temario/video de cursos)
├── vercel.json                 # Headers de seguridad (CSP, HSTS, etc.) y config de rutas de Vercel
├── package.json                 # Declara @upstash/redis (para /api de analíticas) y mercadopago (para /api de cursos y pedidos)
└── GUIA-INSTALACION.md          # Guía paso a paso (no técnica) para conectar Redis/dashboard — no se despliega
```
*(Actualizar esta sección conforme el proyecto crezca y la estructura real cambie.)*

## Arquitectura: cómo encajan las piezas

**No hay carrito ni checkout propio.** El flujo real es: el cliente navega el catálogo → abre el modal de un producto → la calculadora de precio en `js/main.js` calcula el total según el tipo de producto → al hacer clic en "Pedir por WhatsApp" se abre `wa.me` con un mensaje pre-llenado (producto, cantidad, variante, precio, y enlaces a las imágenes subidas). Lo mismo aplica a las categorías "de cotización" (sin precio fijo, ej. offset/serigrafía): en vez de calculadora, hay un checklist que arma un mensaje de cotización.

**Supabase es la única base de datos**, accedida directo desde el navegador con la anon key hardcodeada en `js/main.js`, `js/experience.js` y `admin.html` (`SB_URL`/`SB_KEY` o `URL_SB`/`KEY`). Esto es intencional — la anon key de Supabase está diseñada para ser pública; la seguridad la da **Row Level Security** (`supabase_rls.sql`): lectura pública abierta, escritura solo con sesión autenticada. Al agregar tablas nuevas, siempre hay que sumar sus políticas RLS (lectura pública + escritura solo `authenticated`) siguiendo el patrón de `supabase_rls.sql`.

Tablas principales usadas por el frontend: `categorias`, `productos`, `precios_niveles`, `producto_imagenes`, `cotizacion_items`, `experience_paquetes`. Las imágenes (fotos de producto, diseños subidos por clientes, combinaciones producto+diseño) se guardan en el bucket de Supabase Storage `productos`.

`cotizaciones` y `cotizacion_renglones` (`supabase_cotizaciones.sql`) son distintas: son el registro interno de cotizaciones formales por cliente que arma el panel admin (pestaña "🧾 Registro de Cotizaciones"), no algo que consuma el catálogo público. Por eso, a diferencia del resto de las tablas, su RLS exige `authenticated` también para `SELECT` (sin lectura pública) — protegen datos de clientes.

**Tipos de precio de producto** (campo `productos.tipo`, ver `calcT()` en `js/main.js`):
- `simple` — precio fijo × cantidad.
- `talla` — precio distinto adulto/infantil.
- `cantidad` — niveles por cantidad de piezas, con variante de 50/100 hojas.
- `escalonado` — niveles por cantidad de piezas, precio único por nivel.

**Editor de personalización** (solo para categorías playeras/sudaderas, `esPersonalizable()` en `js/main.js`): el cliente sube una imagen, puede arrastrarla/redimensionarla/rotarla sobre una vista previa del producto (drag/resize/rotate con Pointer Events), y el resultado se compone en un `<canvas>` y se sube a Storage como preview combinada que se adjunta al mensaje de WhatsApp.

**`admin.html`** es un panel autocontenido (HTML+CSS+JS inline, sin dependencias del resto del sitio) que hace login/recuperación de contraseña contra `Supabase Auth` (`/auth/v1/token`, `/auth/v1/recover`, `/auth/v1/user`) y CRUD sobre las tablas del catálogo vía helpers `sbGet/sbPost/sbPatch/sbDelete`. No está enlazado desde la navegación pública. Su pestaña "🧾 Registro de Cotizaciones" administra las tablas `cotizaciones`/`cotizacion_renglones` (buscar, filtrar por estatus, alta/edición/borrado) y genera desde `verCotizacion()` el documento imprimible (ventana nueva, replica el diseño navy/morado de Happy Prints) — reemplaza armar la cotización a mano en Canva.

**Analíticas propias** (Vercel + Upstash Redis) — única excepción a "sitio 100% estático":
- `js/analytics.js` (cargado en `index.html` y `pages/experience.html`) manda pageview/click/scroll/tiempo-en-página a `/api/track` vía `sendBeacon`.
- `/api/track.js` y `/api/stats.js` son funciones serverless de Vercel (Node, `require`, sin paso de build) que usan `@upstash/redis` para guardar/leer contadores.
- `dashboard.html` muestra las estadísticas, protegido por la variable de entorno `DASHBOARD_KEY` en Vercel (se pasa como query param o header `x-dashboard-key`).
- Ver `GUIA-INSTALACION.md` para conectar la base de datos y configurar la clave (no se despliega, está en `.vercelignore`).

**Cursos en línea** (`/pages/cursos.html` + `js/cursos.js`) — única sección del sitio con cuentas de cliente reales y pago en línea:
- Primera vista siempre es el acceso (iniciar sesión / crear cuenta / recuperar contraseña) contra `Supabase Auth` (`/auth/v1/signup`, `/auth/v1/token`, `/auth/v1/recover`, `/auth/v1/user`) — mismo patrón que usa `admin.html`, pero aquí el registro es público (cualquiera puede crear cuenta). La sesión se guarda en `localStorage` bajo `hp_cursos_session` (separada de `hp_admin_session`).
- Tras iniciar sesión se muestra el catálogo: una franja tipo hero (navy) con buscador (filtra por nombre/descripción, client-side) y debajo la cuadrícula de tarjetas (tabla `cursos`, lectura pública igual que `productos`/`categorias`). Cada tarjeta abre una **vista de detalle** (dentro de la misma página, sin cambiar de URL) con "🎯 Para quién es" / "✅ Requisitos" / "📚 Qué vas a aprender" (columnas `dirigido_a`/`requisitos`/`que_aprenderas` de `cursos`, texto libre con una idea por línea, renderizado como viñetas) y el **temario** en acordeón.
- `curso_temas` (temario: título, descripción, duración, `orden`) es de **lectura pública** — ayuda a vender el curso mostrando el contenido antes de comprar. El link de YouTube de cada tema vive aparte, en `curso_tema_videos` (`tema_id` como PK, `youtube_url`), con RLS que **solo deja leerlo a quien ya pagó ese curso** (`inscripciones.estatus = 'pagado'` para ese `curso_id`) o a la administradora — así el temario se puede mostrar públicamente sin exponer los videos reales. Los videos se suben a YouTube como **"No listado"** (gratis, sin límite práctico de espacio) y solo se pega el link; el sitio nunca aloja el archivo de video. El link se incrusta como `<iframe>` de `youtube-nocookie.com` (de ahí el `frame-src` correspondiente en el CSP de esta página) solo cuando el tema realmente tiene video asociado para ese usuario — si no hay match (no pagó, o el video aún no se ha subido), se muestra un estado de "bloqueado"/"próximamente" en su lugar.
- `inscripciones` guarda qué cursos compró cada cliente y su estatus (`pendiente`/`pagado`/`rechazado`). A diferencia de todas las demás tablas del proyecto, su RLS es **por fila de usuario** (`auth.uid() = user_id`) y **no tiene política de `update`/`delete` para clientes** — el estatus de pago solo lo cambia el webhook server-side (ver abajo), nunca el propio cliente, para que nadie pueda marcarse a sí mismo como "pagado".
- Las políticas de escritura de `cursos`/`curso_temas`/`curso_tema_videos` usan el mismo patrón admin-only que `pedidos` (`exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')`) — no basta con estar `authenticated`, porque cualquier cliente registrado también lo está.
- El pago usa **Checkout Pro de Mercado Pago** (redirección a una página de pago hospedada por Mercado Pago, no un SDK de JS en el cliente) — así el sitio nunca toca datos de tarjeta y no hace falta abrir el CSP:
  1. El cliente da clic en "Comprar" → `js/cursos.js` llama a `POST /api/mp-crear-preferencia` con su token de sesión.
  2. `api/mp-crear-preferencia.js` verifica el token contra Supabase, crea una fila `inscripciones` (`pendiente`) usando la **`service_role key`** (bypassea RLS), crea la preferencia de pago en Mercado Pago con `external_reference` = id de esa inscripción, y devuelve `init_point` para redirigir al cliente.
  3. Tras pagar, Mercado Pago llama a `api/mp-webhook.js`, que vuelve a consultar el pago directo en la API de Mercado Pago (nunca confía en el cuerpo del webhook) y actualiza la fila `inscripciones` (`pagado`/`rechazado`) con la `service_role key`.
- Variables de entorno de Vercel necesarias (secretas, nunca en el repo): `MERCADOPAGO_ACCESS_TOKEN` (credenciales de producción de Mercado Pago) y `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API).
- La pestaña "🎓 Cursos" de `admin.html` administra las tablas `cursos`/`curso_temas`/`curso_tema_videos`: alta/edición de curso (nombre, precio, imagen por URL, descripción, activo, y los tres campos de marketing), y un editor de temario por curso (agregar/editar/eliminar tema con su link de YouTube) — el temario solo se puede editar una vez que el curso ya tiene id (mismo patrón que la galería de fotos de `productos`: primero se guarda el recurso padre, luego se le agregan hijos). El video de cada tema se guarda con un upsert (`on_conflict=tema_id`) para no duplicar filas al editar.

**Cuenta de cliente y carrito de compras** (`index.html` + `js/main.js`) — cubre todo el catálogo público (no solo Cursos):
- **Reutiliza la misma cuenta/sesión que `/pages/cursos`**: ambos guardan la sesión en `localStorage` bajo la llave `hp_cursos_session`, así que iniciar sesión en un lado sirve en el otro. El popup de login/registro/recuperar contraseña de `index.html` es una versión compacta (modal, no pantalla completa) del mismo flujo de `js/cursos.js`.
- **Renovación de sesión**: el `access_token` de Supabase expira (1h por default), así que toda llamada autenticada (`sbAuthGet`/`sbAuthWrite` en `js/main.js`, `get()`/`comprarCurso()` en `js/cursos.js`) pasa primero por `ensureFreshSession()`, que si el token ya venció o está por vencer lo renueva con el `refresh_token` guardado (`/auth/v1/token?grant_type=refresh_token`) antes de seguir. Si la renovación falla (refresh_token también inválido), cierra la sesión localmente y avisa con un mensaje claro en vez de dejar pasar el error crudo de Supabase ("JWT expired"). Esta función está duplicada igual en ambos archivos (mismo patrón que el resto del sitio: sin módulos compartidos entre `<script>`).
- Tres íconos en el menú de **todas** las páginas del sitio (donde antes vivían los íconos de redes sociales, que se movieron al `<footer>`): **Mi Perfil**, **Mis Favoritos**, **Mi Carrito**. Solo `index.html` tiene la funcionalidad real (abre los paneles); en el resto de las páginas son enlaces a `/`, ya que ahí es donde vive todo el catálogo/`allProds`.
- Navegar el catálogo **no** requiere cuenta — solo se pide al dar clic en Carrito/Favoritos/Perfil, o al intentar "Agregar al carrito" desde el modal de un producto (botón nuevo junto a "Pedir por WhatsApp", que sigue intacto).
- El carrito vive en `localStorage` (`hp_carrito`) — no se sincroniza entre dispositivos, a diferencia de Mis Favoritos/Mi Perfil/Mis Pedidos que sí están en Supabase.
- `calcLineTotal(producto, state, niveles)` en `js/main.js` es la misma lógica de precios que antes solo existía como `calcT()` (ligada al modal abierto), ahora extraída para que el carrito pueda calcular el total de cada línea sin depender de qué producto esté abierto en el modal.
- Tablas nuevas (`supabase_pedidos.sql`): `perfiles` (nombre/teléfono/rol), `direcciones` (múltiples por cliente, estilo Amazon, con una marcada `predeterminada`), `favoritos`, `pedidos`/`pedido_items`.
- **`perfiles.rol`** (`cliente` por default, `admin` para la cuenta de Sandra) es la pieza clave que distingue clientes de la dueña ahora que ambos comparten el mismo `auth.users` — antes de esto, `admin.html` era la única cuenta y `auth.role() = 'authenticated'` bastaba para decir "es la dueña"; ya no. Las políticas RLS de `pedidos`/`pedido_items` usan `auth.uid() = user_id or exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')` para que cada cliente vea solo sus pedidos y la admin los vea todos desde `admin.html`.
- El pago usa el mismo patrón Checkout Pro que Cursos, con sus propias funciones dedicadas para no mezclar los dos flujos: `api/mp-crear-preferencia-pedido.js` (verifica sesión, **recalcula los precios en el servidor con la misma lógica de `calcLineTotal` portada a Node** — nunca confía en lo que manda el navegador —, fija el envío en $185 sin importar lo que mande el cliente, crea `pedidos`/`pedido_items` con la `service_role key`, crea la preferencia) y `api/mp-webhook-pedido.js` (confirma el pago directo contra la API de Mercado Pago y actualiza `estatus_pago`).
- `pedidos.estatus_pago` (`pendiente`/`pagado`/`rechazado`) solo lo cambia el webhook. `pedidos.estatus_envio` (`confirmado`/`preparacion`/`transito`/`entregado`/`cancelado`) lo cambia la admin desde la pestaña "📦 Pedidos en línea" de `admin.html`, que también muestra un distintivo junto al nombre del cliente según cuántos pedidos pagados lleva: ⭐ "Frecuente" (2+) y 👑 "Premium" (10+).
- Al volver de Mercado Pago, `index.html` recibe `?pedido=approved|pending|failure` y muestra una pantalla de agradecimiento/estatus (`mostrarThanksSiAplica()` en `js/main.js`) — si fue aprobado, además vacía el carrito.
- **Autocompletado de colonia por C.P.**: en el campo C.P. del checkout (`ckCp`) y de "Agregar/editar dirección" en Mi Perfil (`dfCp`), al teclear 5 dígitos `js/main.js` llama (con debounce) a `api/cp-colonias.js`, que consulta del lado del servidor la API externa **codigos.zip** (`https://api.codigos.zip/api/zip/{cp}?pais=MX`, autenticada con el header `X-API-Key` y la variable de entorno `CODIGOS_ZIP_API_KEY`, nunca expuesta al navegador) y devuelve `{ colonias, ciudad, estado }`. El resultado se muestra como chips debajo del campo Colonia; al elegir una se rellena el campo Colonia y, si Ciudad está vacío, también Ciudad — el campo Colonia sigue siendo de texto libre por si el C.P. no da resultados.

## Convenciones de código
- HTML semántico: `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>` en vez de `<div>` genéricos donde aplique.
- CSS:
  - Clases en `kebab-case`.
  - Variables CSS (`:root { --color: ... }`) para colores, tipografías y espaciados reutilizables.
  - Mobile-first: estilos base para móvil, `@media` para pantallas más grandes.
- JavaScript:
  - `const`/`let`, nunca `var`.
  - Nombres de funciones/variables en inglés cuando son genéricos; los nombres ligados al dominio del negocio (categorías, productos) están en español porque reflejan los nombres de columnas de Supabase — mantener esa consistencia.
  - Sin build tools: el código corre tal cual en el navegador (no hay transpilación ni módulos ES importados entre archivos; cada `<script>` se carga por separado en el HTML).
- Sin frameworks ni librerías externas salvo que se indique explícitamente lo contrario.

## Seguridad
- **Antibots (Cloudflare Turnstile)** en los 3 lugares donde alguien inicia sesión, crea cuenta o pide recuperar contraseña: el popup de `index.html`, la pantalla de `/pages/cursos` y el login de `admin.html`. Como los tres hablan directo con el mismo proyecto de Supabase Auth, la protección se activa **a nivel de todo el proyecto** en Supabase (Authentication → Attack Protection), no por separado — por eso los 3 mandan el token (`gotrue_meta_security.captcha_token`) en sus llamadas a `/auth/v1/token`, `/auth/v1/signup` y `/auth/v1/recover`. El patrón (`onTurnstile*`/`resetTurnstile*`, un solo widget compartido arriba de las pestañas de login/registro) está duplicado igual en `js/main.js`, `js/cursos.js` y el inline de `admin.html`, mismo criterio de "sin módulos compartidos" del resto del sitio. La Site Key es pública y está en el HTML (`data-sitekey`); la Secret Key **solo** vive pegada en el dashboard de Supabase, nunca en el repo ni en Vercel (aquí el navegador habla directo con Supabase, no hay una función server-side de por medio que la necesite).
- **Storage** (`storage.objects` en Supabase, ver `supabase_storage_productos.sql`): el bucket `productos` es público para lectura (necesario, ahí viven fotos de producto y las imágenes que suben los clientes al pedir por WhatsApp sin cuenta). Subir (`insert`) se deja abierto a propósito por esa misma razón — el flujo de WhatsApp sube antes de que exista sesión —, pero **sobrescribir y borrar están restringidos solo a la administradora** (mismo patrón `perfiles.rol = 'admin'`). La protección contra archivos maliciosos la da el límite de tipo/tamaño configurado en el bucket mismo (dashboard de Supabase → Storage → productos → Edit bucket), no RLS.
- **`admin.html`** valida el `rol` de `perfiles` **después** de iniciar sesión (`verificarEsAdmin()`, llamada al entrar a `mostrarApp()`) — antes solo verificaba que el correo/contraseña fueran válidos en Supabase Auth, lo que dejaba entrar a la *pantalla* del panel a cualquier cliente registrado (aunque no pudiera hacer nada real ahí gracias al RLS). Si `rol !== 'admin'`, cierra la sesión de inmediato con un mensaje claro.

## Reglas inmutables
- SIEMPRE probar que el sitio funcione abriendo `index.html` directamente o con un servidor local (`npx serve .`), sin depender de un paso de compilación.
- SIEMPRE mantener el HTML, CSS y JS del sitio público en archivos separados (no mezclar estilos o scripts inline salvo casos justificados). `admin.html` y `dashboard.html` son la excepción deliberada (paneles internos, no enlazados públicamente).
- NUNCA incluir credenciales, claves de API o datos de pago reales en el código. La anon key de Supabase que ya está en el código es pública por diseño (protegida por RLS) — no confundir con un secreto; nunca agregar la `service_role key` de Supabase, el `DASHBOARD_KEY`, el `MERCADOPAGO_ACCESS_TOKEN` ni el `CODIGOS_ZIP_API_KEY` al repo (solo como variables de entorno en Vercel).
- Al agregar o modificar tablas de Supabase, siempre actualizar/crear las políticas RLS correspondientes (ver `supabase_rls.sql`) y documentar el script SQL nuevo en la raíz siguiendo el patrón `supabase_<tabla>.sql`.
- Priorizar accesibilidad básica: atributos `alt` en imágenes, buen contraste de color, navegación por teclado.

## Comandos útiles
- Servir el sitio localmente: `npx serve .` o extensión "Live Server" de VS Code.
- No hay comandos de build, lint ni testing configurados (proyecto sin dependencias de frontend; `package.json` solo trae dependencias para `/api`: `@upstash/redis` y `mercadopago`).
- Deploy: `git push` a la rama que Vercel tenga conectada — el deploy y la detección de `/api` son automáticos.

## Automatizaciones (n8n)
- Skills de n8n instaladas en `~/.claude/skills/` (n8n-workflow-patterns, n8n-mcp-tools-expert, n8n-expression-syntax, n8n-validation-expert, n8n-code-javascript, etc.).
- Servidor MCP configurado en `.mcp.json` (usa `npx n8n-mcp`). Falta completar `N8N_API_URL` y `N8N_API_KEY` ahí cuando exista una cuenta de n8n — mientras tanto solo funcionan las herramientas de solo lectura (búsqueda/validación/plantillas).
- Cuando se pida crear o modificar una automatización (workflow, webhook, integración con WhatsApp/Supabase, etc.), usar estas skills y las herramientas MCP de n8n en vez de improvisar JSON de workflow a mano.
- NUNCA poner la API key de n8n directamente en este repo ni en código subido a GitHub — solo en `.mcp.json` (no versionar ese archivo con la key real).

## Notas
- Este archivo debe actualizarse conforme el proyecto evolucione (por ejemplo, si se agrega un backend, un framework, un sistema de pagos real, o un carrito/checkout propio).

---

# Guía de diseño y UX (frontend)

## UX/UI Design System

For all web design, redesign, UX/UI, and frontend tasks, use the available project skills when relevant:

- `creative-director`
- `ux-designer`
- `frontend-design`

Use them together when creating or substantially redesigning a page.

### Responsibilities

- `creative-director`: visual concept, art direction, originality, brand character, and composition.
- `ux-designer`: usability, information architecture, hierarchy, accessibility, responsive behavior, and conversion.
- `frontend-design`: visual execution, frontend quality, interactions, and implementation.

Do not ignore these skills when the task involves UX/UI or frontend design.

---

## Creative Direction

Do not immediately implement the first obvious design solution.

Before a significant redesign, internally consider multiple substantially different creative directions and choose deliberately based on:

- brand
- audience
- industry
- content
- business objective
- desired emotional response
- conversion goal

Do not present all alternatives unless requested. Use this reasoning to produce a stronger final direction.

---

## Visual Quality Standard

The website should feel:

- professional
- contemporary
- intentional
- polished
- brand-specific
- visually sophisticated
- production-ready

Avoid designs that feel:

- childish
- amateur
- template-based
- generic
- visually repetitive
- obviously AI-generated

The goal is not decoration. The goal is strong visual communication.

---

## Avoid Generic AI Patterns

Do not automatically use:

- hero + three cards + CTA layouts
- cards for every piece of information
- excessive rounded corners
- unnecessary pill-shaped elements
- generic icon circles
- repetitive icon + heading + paragraph sections
- excessive gradients
- purple/blue AI-startup aesthetics unless appropriate
- random glassmorphism
- decorative blobs
- excessive shadows
- unnecessary floating containers
- identical section compositions
- centered layouts for every section
- generic stock imagery
- decorative elements without purpose

Cards are allowed when they are genuinely the best information architecture solution.

---

## Composition

Prefer intentional composition.

Consider when appropriate:

- editorial layouts
- asymmetric grids
- strong typography
- controlled whitespace
- contrast in scale
- full-bleed photography
- split compositions
- layered imagery
- image-led storytelling
- visual rhythm
- modular grids
- strong focal points
- deliberate negative space

Different sections may use different compositions while remaining part of the same visual system.

---

## Brand First

Never force the same visual language onto every project.

Before designing, understand the project's:

- industry
- audience
- positioning
- existing identity
- colors
- typography
- imagery
- tone
- business goals

Preserve established brand elements unless explicitly asked to change them.

A logistics company should not look like a SaaS startup.
A luxury company should not look like a children's brand.
A professional service should not look like a generic template.

---

## UX Before Decoration

Creativity must never damage usability.

Always protect:

- readability
- navigation clarity
- accessibility
- information hierarchy
- interaction predictability
- conversion paths
- responsive behavior
- performance

Distinctive does not mean confusing.

---

## Responsive Design

Mobile must be intentionally designed.

Do not simply shrink the desktop version.

When necessary:

- change stacking order
- simplify compositions
- adjust typography
- reconsider spacing
- preserve important visual moments
- adapt navigation
- adapt interactions
- remove nonessential decorative elements

Desktop, tablet, and mobile should each feel considered.

---

## Implementation Workflow

For significant UX/UI work:

1. Understand the existing page and its objective.
2. Identify UX/UI problems.
3. Determine the appropriate creative direction.
4. Consider multiple possible compositions internally.
5. Select the strongest direction.
6. Implement it.
7. Review responsive behavior.
8. Review usability and accessibility.
9. Perform a visual quality pass.
10. Update the preview/Artifact when appropriate.

Do not repeatedly stop for approval on minor implementation decisions unless a decision materially changes scope, branding, content, or functionality.

---

## Artifact / Preview Workflow

When an Artifact or visual preview already exists for the current work:

- Prefer updating the existing Artifact instead of creating a new one.
- Keep the same preview URL whenever technically possible.
- Update the preview after meaningful visual milestones.
- Do not create unnecessary duplicate Artifacts.
- Do not regenerate unchanged areas unnecessarily.

The Artifact should function as the primary visual review surface when available.

---

## Token and Communication Efficiency

Be concise during implementation.

Do not provide long progress reports unless requested.

Do not repeatedly explain code that has already been implemented.

Prioritize:

1. understanding the task
2. modifying the necessary files
3. validating the result
4. updating the visual preview
5. reporting completion briefly

When a visual milestone is ready, a short status message is sufficient.

Example:

"Hero and navigation updated. Preview ready."

Avoid narrating every intermediate action.

---

## Scope Discipline

When asked to modify one page or section:

- inspect only the files reasonably necessary for that task
- avoid exploring unrelated areas of the repository
- avoid refactoring unrelated components
- avoid modifying sections that were not requested
- preserve working functionality outside the requested scope

Do not rebuild an entire page when a targeted change is sufficient.

---

## Iteration

When feedback concerns one specific visual element, modify that element first.

Do not redesign unrelated sections unless the requested change creates a genuine dependency.

Preserve approved design decisions during subsequent iterations.

---

## Final Creative Review

Before considering significant visual work complete, internally check:

1. Does this look generic or obviously AI-generated?
2. Are there too many cards?
3. Are rounded containers being overused?
4. Is the composition predictable?
5. Is the typography creating strong hierarchy?
6. Does the imagery have a purpose?
7. Does the design reflect this specific brand?
8. Is whitespace intentional?
9. Does the page have visual rhythm?
10. Is the interface easy to understand?
11. Does mobile feel intentionally designed?
12. Are decorative elements earning their place?

If weaknesses are obvious, improve them before presenting the result.
---

# Image Performance & Token Efficiency

## Primary Goal

Maintain high visual quality while minimizing:

- production page weight
- unnecessary image downloads
- oversized assets
- unnecessary Claude context usage
- repeated image analysis
- unnecessary Artifact regeneration

Performance optimization must not noticeably damage the visual quality or creative direction of the website.

## Image Asset Rules

Never assume that an original image is production-ready.

Before using an image in production, consider:

- actual rendered dimensions
- source dimensions
- file size
- file format
- transparency requirements
- device sizes
- visual importance

Do not serve a multi-megabyte original image when a significantly smaller optimized asset can provide equivalent visual quality.

## Preferred Formats

Use:

- AVIF when appropriate and well supported by the current implementation
- WebP as a strong default for photographic web imagery
- SVG for suitable logos, icons, and vector graphics
- PNG only when transparency or image characteristics genuinely justify it

Avoid large JPEG or PNG files when a modern format can substantially reduce size without visible quality loss.

Do not convert assets blindly if doing so creates compatibility or quality problems.

## Image Dimensions

Images should be sized according to their actual use.

Do not use extremely large source dimensions for small rendered components.

Examples:

A 400px visual card should not unnecessarily load a 4000px image.

A full-width desktop hero may justify a substantially larger image.

Preserve enough resolution for high-density displays when appropriate, but avoid excessive dimensions.

## Responsive Images

When supported by the framework or implementation, use appropriate responsive image techniques such as:

- `srcset`
- `sizes`
- framework image optimization components
- responsive source selection

Mobile devices should not download desktop-sized imagery unnecessarily.

## Loading Strategy

Prioritize images visible in the initial viewport.

For imagery below the fold:

- prefer lazy loading
- avoid unnecessary preload
- load assets only when reasonably needed

Do not lazy-load the primary Largest Contentful Paint image if doing so would hurt perceived performance.

Use eager loading or appropriate priority only for genuinely critical visual assets.

## Image Weight Targets

Treat these as practical targets rather than absolute rules:

- small UI imagery: preferably under 100 KB
- ordinary content photography: approximately 80–250 KB when visually acceptable
- important large imagery / hero photography: approximately 200–500 KB when visually acceptable

If an image exceeds these ranges substantially, review whether its dimensions, format, or compression can be improved.

Never sacrifice important visible image quality solely to meet an arbitrary file-size target.

## Production Assets

Do not ship:

- unused image variations
- obsolete design assets
- duplicate images
- unnecessarily large originals
- temporary experimentation assets

when they are not required by the production application.

Do not delete original assets automatically unless explicitly requested.

## Performance Awareness

When implementing image-heavy pages, consider:

- Largest Contentful Paint
- cumulative page weight
- number of network requests
- responsive image delivery
- lazy loading
- layout stability
- image dimensions
- caching
- perceived loading speed

Avoid premature micro-optimization, but address obvious high-impact problems.

---

# Claude Context Efficiency

## Do Not Inspect Everything Automatically

Do not inspect every image or every project file unless the task genuinely requires it.

When working on a specific page:

1. identify the files directly associated with that page
2. inspect those first
3. inspect additional files only when necessary

Avoid repository-wide exploration for localized visual changes.

## Image Analysis

Do not repeatedly analyze an image that has already been reviewed and approved unless:

- the user requests changes to it
- its usage changes materially
- there is a technical reason to inspect it again

Reuse known information about approved assets whenever possible.

Do not perform visual analysis of unrelated images.

## Existing Assets

Prefer reusing suitable existing project assets rather than:

- generating unnecessary replacements
- creating duplicate variations
- repeatedly reprocessing the same image

Do not regenerate an approved image merely because surrounding layout changes.

## Artifact Efficiency

When an Artifact or preview already exists:

- update the existing preview when technically possible
- avoid generating duplicate Artifacts
- avoid rebuilding unchanged sections unnecessarily
- update after meaningful visual milestones rather than every micro-change

The user can visually inspect the existing preview without requiring a detailed progress report.

## Communication Efficiency

During implementation:

- keep status messages short
- do not narrate routine file operations
- do not repeatedly summarize unchanged work
- do not provide large code explanations unless requested
- do not ask for approval on trivial implementation choices

Spend context on solving the task rather than describing routine actions.

## Preserve Approved Work

Once a section or visual direction has been approved:

- preserve it
- do not redesign it while working elsewhere
- do not reread or regenerate it unnecessarily
- modify it only when required by dependencies or explicitly requested

## Targeted Iteration

If feedback concerns one element, begin with that element.

Examples:

If the user dislikes the hero, do not redesign the footer.

If the user requests a typography adjustment, do not reconstruct the entire page.

If one image needs replacement, do not reprocess all project imagery.

## Audit Before Bulk Optimization

Before performing large-scale image optimization:

1. inventory the relevant image assets
2. determine dimensions and file sizes
3. identify the highest-impact assets
4. identify unused or duplicate assets where possible
5. recommend priorities
6. estimate potential savings when reasonably possible

Do not modify, compress, convert, rename, move, or delete image files during an audit unless explicitly authorized.

Prioritize high-impact improvements rather than blindly optimizing every asset.

## Final Performance Check

Before considering an image-heavy production page complete, review:

1. Are any images unnecessarily large?
2. Are appropriate modern formats being used?
3. Are responsive image sizes available where useful?
4. Are below-the-fold images lazy-loaded?
5. Is the primary hero/LCP image prioritized correctly?
6. Are unused assets being shipped?
7. Are duplicate assets present?
8. Is mobile downloading unnecessarily large imagery?
9. Can meaningful page-weight savings be achieved without visible quality loss?
10. Have unnecessary Claude re-analysis and Artifact regeneration been avoided?
