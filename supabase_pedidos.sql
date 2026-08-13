-- Happy Prints — Cuentas de cliente compartidas con Cursos: perfiles, favoritos y pedidos en línea
-- (carrito de compra para todo el catálogo, pago real con Mercado Pago)
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

-- ── perfiles ──────────────────────────────────────────────────────────────
-- Respalda "Mi Perfil" del cliente Y le da a las políticas RLS de abajo una
-- forma de reconocer a la administradora (rol = 'admin'), ya que ahora
-- auth.users tiene tanto clientes normales como la cuenta de Sandra.
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  telefono text,
  rol text not null default 'cliente', -- cliente | admin
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;

create policy "Lectura propia perfiles" on perfiles
  for select using (auth.uid() = id);
create policy "Alta propia perfiles" on perfiles
  for insert with check (auth.uid() = id);
create policy "Actualizacion propia perfiles" on perfiles
  for update using (auth.uid() = id);

-- ── direcciones ───────────────────────────────────────────────────────────
-- Direcciones múltiples estilo Amazon, guardadas para no capturarlas cada
-- vez en el checkout.
create table direcciones (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  etiqueta text not null default 'Casa',
  calle text not null,
  numero text not null,
  colonia text not null,
  cp text not null,
  ciudad text not null,
  entre_calles text,
  predeterminada boolean not null default false,
  creado_en timestamptz not null default now()
);

create index direcciones_user_id_idx on direcciones(user_id);

alter table direcciones enable row level security;

create policy "Lectura propia direcciones" on direcciones
  for select using (auth.uid() = user_id);
create policy "Alta propia direcciones" on direcciones
  for insert with check (auth.uid() = user_id);
create policy "Actualizacion propia direcciones" on direcciones
  for update using (auth.uid() = user_id);
create policy "Borrado propio direcciones" on direcciones
  for delete using (auth.uid() = user_id);

-- ── favoritos ─────────────────────────────────────────────────────────────
create table favoritos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  producto_id bigint not null references productos(id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (user_id, producto_id)
);

create index favoritos_user_id_idx on favoritos(user_id);

alter table favoritos enable row level security;

create policy "Lectura propia favoritos" on favoritos
  for select using (auth.uid() = user_id);
create policy "Alta propia favoritos" on favoritos
  for insert with check (auth.uid() = user_id);
create policy "Borrado propio favoritos" on favoritos
  for delete using (auth.uid() = user_id);

-- ── pedidos / pedido_items ───────────────────────────────────────────────
-- A diferencia de "cotizaciones" (solo admin) o "inscripciones" (solo el
-- propio cliente), aquí el cliente ve SUS pedidos y la admin ve TODOS —
-- de ahí el "or exists(...)" en las políticas de abajo.
create table pedidos (
  id bigint generated always as identity (start with 2011) primary key,
  user_id uuid not null references auth.users(id),
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_email text not null,
  calle text not null,
  numero text not null,
  colonia text not null,
  cp text not null,
  ciudad text not null,
  entre_calles text,
  notas text,
  envio numeric not null default 185,
  estatus_pago text not null default 'pendiente', -- pendiente | pagado | rechazado
  estatus_envio text not null default 'confirmado', -- confirmado | preparacion | transito | entregado | cancelado
  total numeric not null,
  mp_preference_id text,
  mp_payment_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table pedido_items (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  producto_id bigint not null references productos(id),
  producto_nombre text not null,
  tipo text not null,
  cantidad int not null,
  variante text,
  precio_unitario numeric not null,
  attach_url text,
  combined_url text
);

create index pedidos_user_id_idx on pedidos(user_id);
create index pedido_items_pedido_id_idx on pedido_items(pedido_id);

alter table pedidos enable row level security;
alter table pedido_items enable row level security;

create policy "Lectura propia o admin pedidos" on pedidos
  for select using (
    auth.uid() = user_id
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
create policy "Actualizacion admin pedidos" on pedidos
  for update using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Lectura propia o admin pedido_items" on pedido_items
  for select using (
    exists (select 1 from pedidos where pedidos.id = pedido_items.pedido_id and pedidos.user_id = auth.uid())
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

-- Nota: no hay política de INSERT para pedidos/pedido_items — solo
-- api/mp-crear-preferencia-pedido.js los crea, con la service_role key
-- (que ignora RLS), para que el cliente nunca pueda inventarse un pedido
-- o un precio directamente contra la API de Supabase.

-- ── Marcar tu propia cuenta (Sandra) como administradora ─────────────────
-- Reemplaza el correo por el que usas para entrar a /admin y ejecútalo
-- UNA VEZ, después del resto de este script:
--
-- insert into perfiles (id, nombre, rol)
-- select id, 'Sandra', 'admin' from auth.users where email = 'TU_CORREO_DE_ADMIN_AQUI'
-- on conflict (id) do update set rol = 'admin';
