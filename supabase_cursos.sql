-- Happy Prints — Catálogo de cursos en línea (página /pages/cursos)
-- Catálogo público de cursos: igual que productos/categorias, cualquiera lo puede leer,
-- solo una sesión autenticada (admin) puede escribir.
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

create table cursos (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  imagen_url text,
  orden int not null default 1,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table cursos enable row level security;

create policy "Lectura publica cursos" on cursos
  for select using (true);
create policy "Escritura autenticada cursos" on cursos
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada cursos" on cursos
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado cursos" on cursos
  for delete using (auth.role() = 'authenticated');

insert into cursos (slug, nombre, descripcion, precio, orden) values
  ('libretas-agendas', 'Libretas y agendas desde cero', 'Aprende a diseñar y armar libretas y agendas personalizadas desde cero, listas para vender.', 1200, 1),
  ('cameo-basico', 'Curso básico de Cameo', 'Domina lo esencial de tu máquina Cameo: configuración, materiales y tus primeros proyectos de corte.', 999, 2),
  ('personalizacion-sublimacion', 'Personalización con sublimación', 'Todo el proceso de personalización con sublimación, de principio a fin, para tus propios productos.', 1700, 3);
