# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción del proyecto

Sitio web de **Happy Prints** (Toluca, México) — catálogo y venta de productos personalizados (sublimación, DTF, playeras, tazas, sellos, offset/serigrafía, grabado láser, etc.). No es un e-commerce con carrito/checkout propio: cada pedido se arma en el navegador y se envía como mensaje pre-llenado de **WhatsApp** (`wa.me`).

**Excepción:** la sección `/pages/cursos` (cursos en línea) sí tiene cuentas de cliente reales y pago en línea con Mercado Pago — ver "Cursos en línea" más abajo.

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
│   └── mp-webhook.js           # Recibe la confirmación de pago de Mercado Pago y activa el acceso al curso
├── /assets/images
├── supabase_*.sql             # Scripts SQL sueltos para correr manualmente en el editor SQL de Supabase
│                                # (RLS, tablas de galería, paquetes de experiencia, ítems de cotización, tallas,
│                                #  registro de cotizaciones, catálogo de cursos, inscripciones de cursos)
├── vercel.json                 # Headers de seguridad (CSP, HSTS, etc.) y config de rutas de Vercel
├── package.json                 # Declara @upstash/redis (para /api de analíticas) y mercadopago (para /api de cursos)
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
- Tras iniciar sesión se muestra el catálogo (tabla `cursos`, lectura pública igual que `productos`/`categorias`).
- `inscripciones` guarda qué cursos compró cada cliente y su estatus (`pendiente`/`pagado`/`rechazado`). A diferencia de todas las demás tablas del proyecto, su RLS es **por fila de usuario** (`auth.uid() = user_id`) y **no tiene política de `update`/`delete` para clientes** — el estatus de pago solo lo cambia el webhook server-side (ver abajo), nunca el propio cliente, para que nadie pueda marcarse a sí mismo como "pagado".
- El pago usa **Checkout Pro de Mercado Pago** (redirección a una página de pago hospedada por Mercado Pago, no un SDK de JS en el cliente) — así el sitio nunca toca datos de tarjeta y no hace falta abrir el CSP:
  1. El cliente da clic en "Comprar" → `js/cursos.js` llama a `POST /api/mp-crear-preferencia` con su token de sesión.
  2. `api/mp-crear-preferencia.js` verifica el token contra Supabase, crea una fila `inscripciones` (`pendiente`) usando la **`service_role key`** (bypassea RLS), crea la preferencia de pago en Mercado Pago con `external_reference` = id de esa inscripción, y devuelve `init_point` para redirigir al cliente.
  3. Tras pagar, Mercado Pago llama a `api/mp-webhook.js`, que vuelve a consultar el pago directo en la API de Mercado Pago (nunca confía en el cuerpo del webhook) y actualiza la fila `inscripciones` (`pagado`/`rechazado`) con la `service_role key`.
- Variables de entorno de Vercel necesarias (secretas, nunca en el repo): `MERCADOPAGO_ACCESS_TOKEN` (credenciales de producción de Mercado Pago) y `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API).
- El acceso al contenido real de las lecciones (video, etc.) todavía no está construido — un curso "pagado" hoy solo muestra "✅ Acceso activo" como marcador de posición.

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

## Reglas inmutables
- SIEMPRE probar que el sitio funcione abriendo `index.html` directamente o con un servidor local (`npx serve .`), sin depender de un paso de compilación.
- SIEMPRE mantener el HTML, CSS y JS del sitio público en archivos separados (no mezclar estilos o scripts inline salvo casos justificados). `admin.html` y `dashboard.html` son la excepción deliberada (paneles internos, no enlazados públicamente).
- NUNCA incluir credenciales, claves de API o datos de pago reales en el código. La anon key de Supabase que ya está en el código es pública por diseño (protegida por RLS) — no confundir con un secreto; nunca agregar la `service_role key` de Supabase, el `DASHBOARD_KEY` ni el `MERCADOPAGO_ACCESS_TOKEN` al repo (solo como variables de entorno en Vercel).
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
