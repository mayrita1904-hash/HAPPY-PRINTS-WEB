-- Happy Prints — Paquetes de la pagina "Contenido Digital" (sitios web), editables desde el admin
-- Ejecutar una sola vez en Supabase → Editor SQL → Run

create table webdev_paquetes (
  id bigint generated always as identity primary key,
  orden int not null default 1,
  nombre text not null,
  tier_key text not null default 'basico', -- basico | catalogo | completo (color de la tarjeta)
  paginas text not null,
  audiencia text,
  feature_1 text,
  feature_2 text,
  feature_3 text,
  feature_4 text,
  feature_5 text,
  precio_valor numeric not null,
  precio_plus boolean not null default false, -- si se le agrega "+" al precio (ej. $30,000+)
  entrega text,
  badge text,
  descripcion text, -- texto largo que aparece en la calculadora "Arma tu sitio a la medida"
  creado_en timestamptz not null default now()
);

alter table webdev_paquetes enable row level security;

create policy "Lectura publica webdev_paquetes" on webdev_paquetes
  for select using (true);
create policy "Escritura autenticada webdev_paquetes" on webdev_paquetes
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada webdev_paquetes" on webdev_paquetes
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado webdev_paquetes" on webdev_paquetes
  for delete using (auth.role() = 'authenticated');

-- Paquetes iniciales (los mismos que ya se mostraban en la pagina)
insert into webdev_paquetes (orden, nombre, tier_key, paginas, audiencia, feature_1, feature_2, feature_3, feature_4, feature_5, precio_valor, precio_plus, entrega, badge, descripcion) values
(1, 'Básico', 'basico', '1 página', 'Para negocios que están empezando su presencia digital',
 'Diseño responsive a partir de tu logo o referencia', 'Página de scroll único con catálogo o servicios', 'Formulario de contacto + botón de WhatsApp', 'Hosting y dominio (primer año incluido)', null,
 5000, false, '5–7 días', null,
 '1 página (scroll único), formulario de contacto + botón de WhatsApp, hosting y dominio (primer año) incluidos. Entrega 5–7 días.'),
(2, 'Catálogo dinámico', 'catalogo', '4–6 páginas', 'Para negocios cuyo catálogo cambia seguido',
 'Todo lo del paquete Básico', 'Catálogo conectado a base de datos', 'Panel para editar productos y precios tú misma', 'Mensaje de WhatsApp prellenado con el pedido', 'SEO on-page básico + 1 ronda de revisiones',
 12500, false, '2–3 semanas', 'MÁS ELEGIDO',
 '4–6 páginas, catálogo conectado a base de datos con panel para editar tú misma, pedidos por WhatsApp, SEO on-page + 1 revisión. Entrega 2–3 semanas.'),
(3, 'Experiencia completa', 'completo', '5+ páginas', 'Para marcas que quieren destacar y vender más',
 'Todo lo del paquete Catálogo dinámico', 'Calculadora de precio automática + cotizador a la medida', 'SEO técnico y optimización de velocidad', 'Soporte y mantenimiento 1 mes incluido', null,
 30000, true, '4–6 semanas', null,
 '5+ páginas, calculadora de precio automática + cotizador a la medida, SEO técnico, soporte y mantenimiento 1 mes incluido. Entrega 4–6 semanas.');
