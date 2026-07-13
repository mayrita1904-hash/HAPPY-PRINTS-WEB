-- Happy Prints — Extras de la pagina "Contenido Digital" (sitios web), editables desde el admin
-- Ejecutar una sola vez en Supabase → Editor SQL → Run

create table webdev_extras (
  id bigint generated always as identity primary key,
  orden int not null default 1,
  categoria text not null, -- agrupa las tarjetas: Contenido y marca, Funcionalidad, Datos y crecimiento, Automatización, Después de la entrega
  nombre text not null,
  precio numeric not null,
  recurrente boolean not null default false, -- true = costo recurrente (no entra en la calculadora, ej. dominio/mantenimiento)
  unidad text, -- sufijo opcional, ej. "/año" o "/mes"
  creado_en timestamptz not null default now()
);

create index webdev_extras_categoria_idx on webdev_extras(categoria);

alter table webdev_extras enable row level security;

create policy "Lectura publica webdev_extras" on webdev_extras
  for select using (true);
create policy "Escritura autenticada webdev_extras" on webdev_extras
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada webdev_extras" on webdev_extras
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado webdev_extras" on webdev_extras
  for delete using (auth.role() = 'authenticated');

-- Extras iniciales (los mismos que ya se mostraban en la pagina)
insert into webdev_extras (orden, categoria, nombre, precio, recurrente, unidad) values
(1, 'Contenido y marca', 'Diseño de logo / identidad de marca', 1400, false, null),
(2, 'Contenido y marca', 'Redacción de textos de venta', 1000, false, null),
(1, 'Funcionalidad', 'Personalizador de producto en tiempo real', 3500, false, null),
(2, 'Funcionalidad', 'Sistema de cotización para productos sin precio fijo', 1500, false, null),
(3, 'Funcionalidad', 'Banner de promociones/descuentos', 650, false, null),
(1, 'Datos y crecimiento', 'Dashboard de analíticas propio', 2250, false, null),
(2, 'Datos y crecimiento', 'SEO básico (títulos y descripciones)', 1150, false, null),
(3, 'Datos y crecimiento', 'SEO avanzado (mapa del sitio, buscadores)', 2000, false, null),
(1, 'Automatización', 'Confirmación automática de pedido por WhatsApp', 1500, false, null),
(2, 'Automatización', 'Recordatorios automáticos de cotización', 1500, false, null),
(3, 'Automatización', 'Aviso automático al admin de nuevo pedido', 750, false, null),
(1, 'Después de la entrega', 'Renovación de dominio (año 2 en adelante)', 400, true, '/año'),
(2, 'Después de la entrega', 'Capacitación para usar tu panel', 500, false, null),
(3, 'Después de la entrega', 'Mantenimiento mensual', 1000, true, '/mes'),
(4, 'Después de la entrega', 'Migración desde tu hosting actual', 1150, false, null);
