# Tienda Online

## Descripción del proyecto
Página web de venta de productos (e-commerce) construida con HTML, CSS y JavaScript puro (sin frameworks). El objetivo es mostrar un catálogo de productos, permitir agregarlos a un carrito, y gestionar el proceso de compra.

- Tipo de proyecto: sitio estático / frontend
- Stack: HTML5, CSS3, JavaScript (vanilla, sin frameworks ni build tools)
- Estado: proyecto nuevo, se está construyendo desde cero

## Estructura del proyecto
```
/
├── index.html          # Página principal (catálogo de productos)
├── /pages              # Otras páginas (producto individual, carrito, checkout, etc.)
├── /css                # Hojas de estilo
│   └── styles.css
├── /js                 # Lógica en JavaScript
│   ├── main.js
│   ├── cart.js         # Lógica del carrito de compras
│   └── products.js     # Datos/lógica de productos
├── /assets             # Imágenes, íconos, fuentes
│   └── /images
└── /data
    └── products.json    # Catálogo de productos (si no hay backend)
```
*(Actualizar esta sección conforme el proyecto crezca y la estructura real cambie.)*

## Convenciones de código
- HTML semántico: usar etiquetas como `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>` en vez de `<div>` genéricos donde aplique.
- CSS:
  - Nombrar clases en formato `kebab-case` (ej: `product-card`, `cart-item`).
  - Usar metodología tipo BEM si el proyecto crece (`bloque__elemento--modificador`).
  - Variables CSS (`:root { --color-primary: ... }`) para colores, tipografías y espaciados reutilizables.
  - Mobile-first: escribir estilos base para móvil y usar `@media` para pantallas más grandes.
- JavaScript:
  - Usar `const`/`let`, nunca `var`.
  - Nombres de funciones y variables en inglés, en `camelCase`.
  - Evitar manipular el DOM directamente desde múltiples archivos; centralizar la lógica del carrito en `cart.js`.
  - Comentar funciones complejas brevemente (qué hace, no cómo).
- Sin frameworks ni librerías externas salvo que se indique explícitamente lo contrario.
- Sin build tools (webpack, vite, etc.) — el sitio debe poder abrirse directamente en el navegador o con un servidor local simple.

## Funcionalidades clave
- Catálogo de productos con imagen, nombre, precio y descripción corta.
- Carrito de compras: agregar, quitar, actualizar cantidad, calcular total.
- Persistencia del carrito en `localStorage` (para que no se pierda al recargar la página).
- Página de detalle de producto.
- Formulario/página de checkout (sin procesamiento real de pagos a menos que se indique lo contrario).
- Diseño responsive (debe verse bien en móvil, tablet y escritorio).

## Reglas inmutables
- SIEMPRE probar que el sitio funcione abriendo `index.html` directamente o con un servidor local (ej: Live Server), sin depender de un paso de compilación.
- SIEMPRE mantener el HTML, CSS y JS en archivos separados (no mezclar estilos o scripts inline salvo casos justificados).
- NUNCA incluir credenciales, claves de API o datos de pago reales en el código.
- SIEMPRE validar formularios (checkout, contacto) tanto en el cliente como recordar que en producción se necesitaría validación en servidor.
- Priorizar accesibilidad básica: atributos `alt` en imágenes, buen contraste de color, navegación por teclado.

## Comandos útiles
- Servir el sitio localmente: `npx serve .` o extensión "Live Server" de VS Code.
- No hay comandos de build ni de testing por ahora (proyecto sin dependencias).

## Automatizaciones (n8n)
- Skills de n8n instaladas en `~/.claude/skills/` (n8n-workflow-patterns, n8n-mcp-tools-expert, n8n-expression-syntax, n8n-validation-expert, n8n-code-javascript, etc.).
- Servidor MCP configurado en `.mcp.json` (usa `npx n8n-mcp`). Falta completar `N8N_API_URL` y `N8N_API_KEY` ahí cuando exista una cuenta de n8n — mientras tanto solo funcionan las herramientas de solo lectura (búsqueda/validación/plantillas).
- Cuando se pida crear o modificar una automatización (workflow, webhook, integración con WhatsApp/Supabase, etc.), usar estas skills y las herramientas MCP de n8n en vez de improvisar JSON de workflow a mano.
- NUNCA poner la API key de n8n directamente en este repo ni en código subido a GitHub — solo en `.mcp.json` (no versionar ese archivo con la key real).

## Analíticas propias (Vercel + Upstash Redis)
- `/api/track.js` y `/api/stats.js` son funciones serverless de Vercel (Node, `require`, sin build step) — únicas excepciones a "sitio 100% estático". Usan `@upstash/redis` (declarado en `package.json`) para guardar/leer eventos.
- `js/analytics.js` (cargado en `index.html` y `pages/experience.html`) manda vistas, clics, scroll y tiempo en página a `/api/track` vía `sendBeacon`.
- `dashboard.html` (en `/dashboard.html`, no enlazado en el menú) muestra las estadísticas, protegido con la variable de entorno `DASHBOARD_KEY` en Vercel.
- Ver `GUIA-INSTALACION.md` para conectar la base de datos y configurar la clave (ese archivo no se despliega, está en `.vercelignore`).

## Notas
- Este archivo debe actualizarse conforme el proyecto evolucione (por ejemplo, si se agrega un backend, un framework, o un sistema de pagos real).
- Si se decide más adelante migrar a un framework (React, Vue, etc.) o agregar backend, documentar aquí el cambio de stack y las nuevas convenciones.
