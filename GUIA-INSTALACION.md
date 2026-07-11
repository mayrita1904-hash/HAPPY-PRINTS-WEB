# Guía de instalación — Analíticas propias de Happy Prints

Sistema de medición hecho a la medida: mide vistas, clics, scroll y tiempo en página, y lo guarda en una base de datos gratuita (Upstash Redis) conectada a Vercel. El panel para verlo vive en `/dashboard.html`, protegido con una clave que tú eliges.

## Paso 1 — Conectar la base de datos en Vercel
1. Entra a tu proyecto en [vercel.com](https://vercel.com) → pestaña **Storage**.
2. Click en **Create Database** (o **Browse Marketplace**) → busca **Upstash** → elige **Redis** → plan gratuito.
3. Conéctala a tu proyecto `happy-prints-web`. Vercel agrega automáticamente las variables de entorno necesarias (se llaman `KV_REST_API_URL` / `KV_REST_API_TOKEN` o `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, según la versión — el código ya contempla ambos nombres, no necesitas hacer nada extra aquí).

## Paso 2 — Elegir tu clave del dashboard
1. En Vercel → tu proyecto → **Settings** → **Environment Variables**.
2. Agrega una variable llamada `DASHBOARD_KEY` con una contraseña que tú inventes (ej. una frase larga y única). Esta es la clave que vas a escribir en `/dashboard.html` para ver tus estadísticas — no la compartas.
3. Guarda.

## Paso 3 — Subir los archivos nuevos a GitHub
Archivos que hay que subir (avísame y te voy guiando uno por uno como siempre):
- `package.json` (raíz)
- `api/track.js`
- `api/stats.js`
- `js/analytics.js`
- `dashboard.html`
- `index.html` y `pages/experience.html` (ya traen la línea que activa el rastreo)

## Paso 4 — Verificar
1. Espera a que Vercel termine de desplegar (detecta `package.json` y las funciones en `/api` automáticamente, no requiere configuración extra).
2. Abre tu sitio normal y navega un poco (para generar datos de prueba).
3. Entra a `https://happy-prints-web.vercel.app/dashboard.html`, escribe la clave del Paso 2 y deberías ver las tarjetas y la gráfica con la actividad reciente.

## Qué mide
- **Vistas de página** por día y por URL.
- **Clics** en botones y enlaces (incluye el botón flotante de WhatsApp, redes sociales, "Ver catálogo", etc.) — identificados por su texto o destino.
- **Scroll** en hitos de 25/50/75/100% de la página.
- **Tiempo en página** (promedio de segundos antes de salir).
- **Dispositivo** (móvil vs escritorio) y **de dónde llegó** el visitante (referrer).

## Notas
- No usa cookies de terceros ni scripts externos — todo corre en tus propios archivos y tu propia base de datos.
- Si algún día quieres borrar todos los datos guardados, se puede vaciar la base desde el panel de Upstash directamente.
