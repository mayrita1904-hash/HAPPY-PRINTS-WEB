-- Happy Prints — Activar Row Level Security (RLS)
-- Ejecutar una sola vez en Supabase → Editor SQL → Run
-- Resultado: el catálogo público sigue leyendo todo sin login;
-- agregar/editar/borrar solo funciona con una sesión iniciada (panel admin).

alter table categorias enable row level security;
alter table productos enable row level security;
alter table precios_niveles enable row level security;

-- Lectura pública (necesaria para que el catálogo del sitio funcione sin login)
create policy "Lectura publica categorias" on categorias
  for select using (true);

create policy "Lectura publica productos" on productos
  for select using (true);

create policy "Lectura publica precios_niveles" on precios_niveles
  for select using (true);

-- Escritura solo para usuarios autenticados (panel admin con sesión iniciada)
create policy "Escritura autenticada categorias" on categorias
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada categorias" on categorias
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado categorias" on categorias
  for delete using (auth.role() = 'authenticated');

create policy "Escritura autenticada productos" on productos
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada productos" on productos
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado productos" on productos
  for delete using (auth.role() = 'authenticated');

create policy "Escritura autenticada precios_niveles" on precios_niveles
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada precios_niveles" on precios_niveles
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado precios_niveles" on precios_niveles
  for delete using (auth.role() = 'authenticated');
