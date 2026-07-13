# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción del proyecto

Sitio web de **Happy Prints** (Toluca, México) — catálogo y venta de productos personalizados (sublimación, DTF, playeras, tazas, sellos, offset/serigrafía, grabado láser, etc.). No es un e-commerce con carrito/checkout propio: cada pedido se arma en el navegador y se envía como mensaje pre-llenado de **WhatsApp** (`wa.me`).

- Tipo de proyecto: sitio estático (HTML/CSS/JS vanilla, sin frameworks ni build tools) + un puñado de funciones serverless de Vercel para analíticas propias.
- Base de datos: **Supabase** (Postgres + Storage + Auth), consumida directo desde el cliente vía REST (`/rest/v1/...`), sin backend intermedio.
- Deploy: Vercel, auto-deploy al hacer push (detecta `package.json` y `/api` sin configuración extra).

## Estructura real del proyecto
```
/
├── index.html              # Home: catálogo, categorías, carrusel de destacados, modal de producto
├── admin.html               # Panel admin (CRUD de catálogo). No enlazado en el menú, protegido con Supabase Auth
├── dashboard.html            # Dashboard de analíticas. No enlazado en el menú, protegido con DASHBOARD_KEY
├── /pages
│   └── experience.html      # Página de "Servicios"/paquetes de experiencia
├── /css/styles.css          # Única hoja de estilos del sitio público
├── /js
│   ├── main.js               # Toda la lógica del home: carga Supabase, catálogo, calculadora de precio,
│   │                          # editor de personalización, subida de archivos, mensaje de WhatsApp
│   ├── experience.js         # Carga los paquetes de la página de servicios
│   └── analytics.js          # Beacon de analíticas propias (ver abajo)
├── /api
│   ├── track.js              # Función serverless Vercel: recibe eventos de analytics.js, escribe en Redis
│   └── stats.js               # Función serverless Vercel: agrega y expone las estadísticas (protegida por clave)
├── /assets/images
├── supabase_*.sql             # Scripts SQL sueltos para correr manualmente en el editor SQL de Supabase
│                                # (RLS, tablas de galería, paquetes de experiencia, ítems de cotización, tallas)
├── vercel.json                 # Headers de seguridad (CSP, HSTS, etc.) y config de rutas de Vercel
├── package.json                 # Solo declara @upstash/redis (dependencia de /api, no del frontend)
└── GUIA-INSTALACION.md          # Guía paso a paso (no técnica) para conectar Redis/dashboard — no se despliega
```
*(Actualizar esta sección conforme el proyecto crezca y la estructura real cambie.)*

## Arquitectura: cómo encajan las piezas

**No hay carrito ni checkout propio.** El flujo real es: el cliente navega el catálogo → abre el modal de un producto → la calculadora de precio en `js/main.js` calcula el total según el tipo de producto → al hacer clic en "Pedir por WhatsApp" se abre `wa.me` con un mensaje pre-llenado (producto, cantidad, variante, precio, y enlaces a las imágenes subidas). Lo mismo aplica a las categorías "de cotización" (sin precio fijo, ej. offset/serigrafía): en vez de calculadora, hay un checklist que arma un mensaje de cotización.

**Supabase es la única base de datos**, accedida directo desde el navegador con la anon key hardcodeada en `js/main.js`, `js/experience.js` y `admin.html` (`SB_URL`/`SB_KEY` o `URL_SB`/`KEY`). Esto es intencional — la anon key de Supabase está diseñada para ser pública; la seguridad la da **Row Level Security** (`supabase_rls.sql`): lectura pública abierta, escritura solo con sesión autenticada. Al agregar tablas nuevas, siempre hay que sumar sus políticas RLS (lectura pública + escritura solo `authenticated`) siguiendo el patrón de `supabase_rls.sql`.

Tablas principales usadas por el frontend: `categorias`, `productos`, `precios_niveles`, `producto_imagenes`, `cotizacion_items`, `experience_paquetes`. Las imágenes (fotos de producto, diseños subidos por clientes, combinaciones producto+diseño) se guardan en el bucket de Supabase Storage `productos`.

**Tipos de precio de producto** (campo `productos.tipo`, ver `calcT()` en `js/main.js`):
- `simple` — precio fijo × cantidad.
- `talla` — precio distinto adulto/infantil.
- `cantidad` — niveles por cantidad de piezas, con variante de 50/100 hojas.
- `escalonado` — niveles por cantidad de piezas, precio único por nivel.

**Editor de personalización** (solo para categorías playeras/sudaderas, `esPersonalizable()` en `js/main.js`): el cliente sube una imagen, puede arrastrarla/redimensionarla/rotarla sobre una vista previa del producto (drag/resize/rotate con Pointer Events), y el resultado se compone en un `<canvas>` y se sube a Storage como preview combinada que se adjunta al mensaje de WhatsApp.

**`admin.html`** es un panel autocontenido (HTML+CSS+JS inline, sin dependencias del resto del sitio) que hace login/recuperación de contraseña contra `Supabase Auth` (`/auth/v1/token`, `/auth/v1/recover`, `/auth/v1/user`) y CRUD sobre las tablas del catálogo vía helpers `sbGet/sbPost/sbPatch/sbDelete`. No está enlazado desde la navegación pública.

**Analíticas propias** (Vercel + Upstash Redis) — única excepción a "sitio 100% estático":
- `js/analytics.js` (cargado en `index.html` y `pages/experience.html`) manda pageview/click/scroll/tiempo-en-página a `/api/track` vía `sendBeacon`.
- `/api/track.js` y `/api/stats.js` son funciones serverless de Vercel (Node, `require`, sin paso de build) que usan `@upstash/redis` para guardar/leer contadores.
- `dashboard.html` muestra las estadísticas, protegido por la variable de entorno `DASHBOARD_KEY` en Vercel (se pasa como query param o header `x-dashboard-key`).
- Ver `GUIA-INSTALACION.md` para conectar la base de datos y configurar la clave (no se despliega, está en `.vercelignore`).

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
- NUNCA incluir credenciales, claves de API o datos de pago reales en el código. La anon key de Supabase que ya está en el código es pública por diseño (protegida por RLS) — no confundir con un secreto; nunca agregar la `service_role key` de Supabase ni el `DASHBOARD_KEY` al repo.
- Al agregar o modificar tablas de Supabase, siempre actualizar/crear las políticas RLS correspondientes (ver `supabase_rls.sql`) y documentar el script SQL nuevo en la raíz siguiendo el patrón `supabase_<tabla>.sql`.
- Priorizar accesibilidad básica: atributos `alt` en imágenes, buen contraste de color, navegación por teclado.

## Comandos útiles
- Servir el sitio localmente: `npx serve .` o extensión "Live Server" de VS Code.
- No hay comandos de build, lint ni testing configurados (proyecto sin dependencias de frontend; `package.json` solo trae `@upstash/redis` para `/api`).
- Deploy: `git push` a la rama que Vercel tenga conectada — el deploy y la detección de `/api` son automáticos.

## Automatizaciones (n8n)
- Skills de n8n instaladas en `~/.claude/skills/` (n8n-workflow-patterns, n8n-mcp-tools-expert, n8n-expression-syntax, n8n-validation-expert, n8n-code-javascript, etc.).
- Servidor MCP configurado en `.mcp.json` (usa `npx n8n-mcp`). Falta completar `N8N_API_URL` y `N8N_API_KEY` ahí cuando exista una cuenta de n8n — mientras tanto solo funcionan las herramientas de solo lectura (búsqueda/validación/plantillas).
- Cuando se pida crear o modificar una automatización (workflow, webhook, integración con WhatsApp/Supabase, etc.), usar estas skills y las herramientas MCP de n8n en vez de improvisar JSON de workflow a mano.
- NUNCA poner la API key de n8n directamente en este repo ni en código subido a GitHub — solo en `.mcp.json` (no versionar ese archivo con la key real).

## Notas
- Este archivo debe actualizarse conforme el proyecto evolucione (por ejemplo, si se agrega un backend, un framework, un sistema de pagos real, o un carrito/checkout propio).
