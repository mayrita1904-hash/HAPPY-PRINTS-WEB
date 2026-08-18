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
