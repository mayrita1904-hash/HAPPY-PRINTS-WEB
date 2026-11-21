-- Happy Prints — Checklist de "Cotización personalizada" para categorías sin costo fijo
-- (Offset y Serigrafía, Impresión Digital, Grabado y Corte Láser)
-- Ejecutar una sola vez en Supabase → SQL Editor → Run

create table cotizacion_items (
  id bigint generated always as identity primary key,
  categoria_id bigint not null references categorias(id) on delete cascade,
  nombre text not null,
  orden int not null default 1,
  creado_en timestamptz not null default now()
);

create index cotizacion_items_categoria_id_idx on cotizacion_items(categoria_id);

alter table cotizacion_items enable row level security;

create policy "Lectura publica cotizacion_items" on cotizacion_items
  for select using (true);
create policy "Escritura autenticada cotizacion_items" on cotizacion_items
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada cotizacion_items" on cotizacion_items
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado cotizacion_items" on cotizacion_items
  for delete using (auth.role() = 'authenticated');

-- Items iniciales (el admin puede editarlos, agregarlos o quitarlos despues desde el panel)
insert into cotizacion_items (categoria_id, nombre, orden) values
  (37, 'Playeras estampadas', 1),
  (37, 'Volantes / Flyers', 2),
  (37, 'Trípticos y dípticos', 3),
  (37, 'Tarjetas de presentación', 4),
  (37, 'Bolsas de papel impresas', 5),
  (29, 'Lonas y banners', 1),
  (29, 'Posters / Carteles', 2),
  (29, 'Vinil para vehículos', 3),
  (29, 'Displays y stands', 4),
  (31, 'Grabado en madera', 1),
  (31, 'Grabado en acrílico', 2),
  (31, 'Corte de figuras personalizadas', 3),
  (31, 'Placas y reconocimientos', 4),
  (31, 'Llaveros grabados', 5);
