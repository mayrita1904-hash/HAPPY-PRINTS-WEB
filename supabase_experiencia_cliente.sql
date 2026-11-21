-- ════════════════════════════════════════════════════════════════════
-- Experiencia del cliente: días de producción, fecha requerida y
-- aprobación de diseños en línea.
-- Correr UNA vez en Supabase → SQL Editor (proyecto happy-prints)
-- ANTES de publicar el código que lo usa.
-- ════════════════════════════════════════════════════════════════════

-- 1) Días hábiles (lunes a viernes) que tarda cada producto en producirse.
--    Se edita por producto desde admin.html. Default: 3.
alter table productos
  add column if not exists dias_produccion int not null default 3
  check (dias_produccion between 0 and 60);

-- 2) Fecha para la que el cliente necesita su pedido (opcional, la elige en el checkout).
alter table pedidos
  add column if not exists fecha_requerida date;

-- 3) Pruebas de diseño que la administradora sube para que el cliente las apruebe.
create table if not exists pedido_pruebas (
  id                 bigint generated always as identity primary key,
  pedido_id          bigint not null references pedidos(id) on delete cascade,
  imagen_url         text not null,
  nota_admin         text,
  estatus            text not null default 'pendiente'
                     check (estatus in ('pendiente', 'aprobado', 'cambio')),
  comentario_cliente text,
  visto_admin        boolean not null default true,  -- false = respuesta nueva que la admin no ha visto
  creado_en          timestamptz not null default now(),
  respondido_en      timestamptz
);
create index if not exists pedido_pruebas_pedido_idx on pedido_pruebas (pedido_id);

alter table pedido_pruebas enable row level security;

-- Lectura: el dueño del pedido o la administradora.
drop policy if exists "pruebas_select_dueno_o_admin" on pedido_pruebas;
create policy "pruebas_select_dueno_o_admin" on pedido_pruebas
  for select using (
    exists (select 1 from pedidos pe where pe.id = pedido_id and pe.user_id = auth.uid())
    or exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

-- Escritura directa: solo la administradora (subir, editar, borrar pruebas).
drop policy if exists "pruebas_admin_insert" on pedido_pruebas;
create policy "pruebas_admin_insert" on pedido_pruebas
  for insert with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
drop policy if exists "pruebas_admin_update" on pedido_pruebas;
create policy "pruebas_admin_update" on pedido_pruebas
  for update using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));
drop policy if exists "pruebas_admin_delete" on pedido_pruebas;
create policy "pruebas_admin_delete" on pedido_pruebas
  for delete using (exists (select 1 from perfiles where id = auth.uid() and rol = 'admin'));

-- 4) El cliente NO tiene permiso de update sobre la tabla (podría tocar otras columnas).
--    Responde solo a través de esta función, que valida que el pedido sea suyo y que la
--    prueba siga pendiente. Si aprueba, el pedido pasa a "En preparación".
create or replace function responder_prueba(p_id bigint, p_aprobar boolean, p_comentario text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido bigint;
begin
  select pp.pedido_id into v_pedido
  from pedido_pruebas pp
  join pedidos pe on pe.id = pp.pedido_id
  where pp.id = p_id and pe.user_id = auth.uid() and pp.estatus = 'pendiente';

  if v_pedido is null then
    raise exception 'No encontramos esta prueba o ya fue respondida.';
  end if;

  update pedido_pruebas
     set estatus = case when p_aprobar then 'aprobado' else 'cambio' end,
         comentario_cliente = left(nullif(trim(coalesce(p_comentario, '')), ''), 1000),
         respondido_en = now(),
         visto_admin = false
   where id = p_id;

  if p_aprobar then
    update pedidos
       set estatus_envio = 'preparacion', actualizado_en = now()
     where id = v_pedido and estatus_envio = 'confirmado';
  end if;
end;
$$;

revoke all on function responder_prueba(bigint, boolean, text) from public, anon;
grant execute on function responder_prueba(bigint, boolean, text) to authenticated;
