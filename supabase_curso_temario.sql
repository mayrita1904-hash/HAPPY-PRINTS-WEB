-- Happy Prints — Contenido y temario de cursos (para /pages/cursos)
-- Agrega información de marketing a los cursos existentes y un temario con
-- video de YouTube (subido como "No listado") por tema, protegido para que
-- solo lo vea quien ya pagó ese curso específico (o la administradora).
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

-- ── Información de marketing del curso ──────────────────────────────────
alter table cursos add column dirigido_a text;      -- "Para quién es" (una idea por línea)
alter table cursos add column requisitos text;      -- "Requisitos" (una idea por línea)
alter table cursos add column que_aprenderas text;  -- "Qué vas a aprender" (una idea por línea)

-- Las políticas de escritura de "cursos" (supabase_cursos.sql) se crearon
-- cuando admin.html era la única cuenta autenticada del sitio. Hoy cualquier
-- cliente registrado también es "authenticated" (cuentas compartidas con la
-- tienda), así que las reemplazamos por el patrón admin-only que ya usan
-- pedidos/perfiles, para que solo Sandra pueda crear o editar cursos.
drop policy "Escritura autenticada cursos" on cursos;
drop policy "Actualizacion autenticada cursos" on cursos;
drop policy "Borrado autenticado cursos" on cursos;
create policy "Escritura admin cursos" on cursos
  for insert with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Actualizacion admin cursos" on cursos
  for update using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Borrado admin cursos" on cursos
  for delete using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));

-- ── curso_temas: el temario (público, ayuda a vender el curso) ──────────
create table curso_temas (
  id bigint generated always as identity primary key,
  curso_id bigint not null references cursos(id) on delete cascade,
  orden int not null default 1,
  titulo text not null,
  descripcion text,
  duracion text
);
create index curso_temas_curso_id_idx on curso_temas(curso_id);

alter table curso_temas enable row level security;
create policy "Lectura publica curso_temas" on curso_temas
  for select using (true);
create policy "Escritura admin curso_temas" on curso_temas
  for insert with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Actualizacion admin curso_temas" on curso_temas
  for update using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Borrado admin curso_temas" on curso_temas
  for delete using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));

-- ── curso_tema_videos: el link de YouTube, en una tabla aparte para poder
-- protegerlo con su propia política (nadie puede leerlo sin haber pagado) ──
create table curso_tema_videos (
  tema_id bigint primary key references curso_temas(id) on delete cascade,
  youtube_url text not null
);

alter table curso_tema_videos enable row level security;
create policy "Lectura pagados o admin curso_tema_videos" on curso_tema_videos
  for select using (
    exists (
      select 1 from curso_temas t
      join inscripciones i on i.curso_id = t.curso_id
      where t.id = curso_tema_videos.tema_id
        and i.user_id = auth.uid()
        and i.estatus = 'pagado'
    )
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
create policy "Escritura admin curso_tema_videos" on curso_tema_videos
  for insert with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Actualizacion admin curso_tema_videos" on curso_tema_videos
  for update using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
create policy "Borrado admin curso_tema_videos" on curso_tema_videos
  for delete using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
