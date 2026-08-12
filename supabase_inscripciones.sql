-- Happy Prints — Inscripciones/compras de cursos por cliente (página /pages/cursos)
-- A diferencia del resto de las tablas del catalogo, aqui cada cliente solo puede ver
-- y crear SUS PROPIAS filas (auth.uid() = user_id) — es la primera tabla del proyecto
-- con este patron de "una fila por usuario", en vez de lectura publica o solo-admin.
--
-- No existe politica de UPDATE/DELETE para clientes a proposito: el estatus de pago
-- ('pendiente' -> 'pagado'/'rechazado') solo lo cambia el webhook de Mercado Pago
-- (/api/mp-webhook.js), que usa la service_role key y por lo tanto ignora RLS por
-- completo. Un cliente nunca puede marcarse a si mismo como "pagado".
--
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

create table inscripciones (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  curso_id bigint not null references cursos(id),
  estatus text not null default 'pendiente', -- pendiente | pagado | rechazado
  monto numeric not null,
  mp_preference_id text,
  mp_payment_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index inscripciones_user_id_idx on inscripciones(user_id);

alter table inscripciones enable row level security;

create policy "Lectura propia inscripciones" on inscripciones
  for select using (auth.uid() = user_id);
create policy "Alta propia inscripciones" on inscripciones
  for insert with check (auth.uid() = user_id);
