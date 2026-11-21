-- Happy Prints — Galería de fotos por producto (estilo Amazon)
-- Ejecutar una sola vez en Supabase → Editor SQL → Run
-- Crea una tabla para guardar varias fotos por producto (además de la foto principal
-- que ya existe en productos.imagen_url, que se sigue usando como respaldo).

create table producto_imagenes (
  id bigint generated always as identity primary key,
  producto_id bigint not null references productos(id) on delete cascade,
  url text not null,
  orden int not null default 1,
  creado_en timestamptz not null default now()
);

create index producto_imagenes_producto_id_idx on producto_imagenes(producto_id);

alter table producto_imagenes enable row level security;

-- Lectura pública (el catálogo la necesita sin login)
create policy "Lectura publica producto_imagenes" on producto_imagenes
  for select using (true);

-- Escritura solo para usuarios autenticados (panel admin con sesión iniciada)
create policy "Escritura autenticada producto_imagenes" on producto_imagenes
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada producto_imagenes" on producto_imagenes
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado producto_imagenes" on producto_imagenes
  for delete using (auth.role() = 'authenticated');
