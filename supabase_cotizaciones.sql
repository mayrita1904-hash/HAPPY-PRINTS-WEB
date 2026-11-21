-- Happy Prints — Registro y control de cotizaciones (panel admin)
-- Cotizaciones formales por cliente (pistas de eventos, invitaciones, figuras, etc.),
-- distintas del checklist de "cotizacion_items" del catalogo publico.
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

create table cotizaciones (
  id bigint generated always as identity primary key,
  numero_orden text not null,
  fecha date not null default current_date,
  cliente_nombre text not null,
  cliente_numero text,
  enviar_a text,
  condiciones text default 'Sin especificar',
  estatus text not null default 'pendiente', -- pendiente | aceptada | rechazada
  notas text,
  footer_nota text default 'El costo NO incluyen IVA. En caso de requerir factura el costo aumenta un 16%. Cualquier diseño adicional tendrá un costo de $300.⁰⁰ (trescientos pesos 00/M.N.) Una vez realizada la solicitud no habrá devolución. Para formalizar el pedido se solicita un 70% del total del trabajo. Los trabajos urgentes tendrán un costo adicional dependiendo la premura y los tipos de materiales.',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table cotizacion_renglones (
  id bigint generated always as identity primary key,
  cotizacion_id bigint not null references cotizaciones(id) on delete cascade,
  descripcion text not null,
  precio_texto text not null, -- texto libre: "$18,837.00", "$57.00 c/u", "$350 - $400"
  orden int not null default 1
);

create index cotizacion_renglones_cotizacion_id_idx on cotizacion_renglones(cotizacion_id);

-- RLS: a diferencia del catalogo publico, estas tablas NUNCA las lee el sitio publico,
-- solo el panel admin con sesion iniciada. Por eso tambien el SELECT exige autenticacion
-- (sin politica de lectura publica) -- protege nombres/direcciones/precios de clientes.
alter table cotizaciones enable row level security;
alter table cotizacion_renglones enable row level security;

create policy "Lectura autenticada cotizaciones" on cotizaciones
  for select using (auth.role() = 'authenticated');
create policy "Escritura autenticada cotizaciones" on cotizaciones
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada cotizaciones" on cotizaciones
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado cotizaciones" on cotizaciones
  for delete using (auth.role() = 'authenticated');

create policy "Lectura autenticada cotizacion_renglones" on cotizacion_renglones
  for select using (auth.role() = 'authenticated');
create policy "Escritura autenticada cotizacion_renglones" on cotizacion_renglones
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada cotizacion_renglones" on cotizacion_renglones
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado cotizacion_renglones" on cotizacion_renglones
  for delete using (auth.role() = 'authenticated');
