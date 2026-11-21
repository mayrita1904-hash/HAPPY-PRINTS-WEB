-- Happy Prints — Paquetes de "Happy Prints Experience" (editables desde el admin)
-- Ejecutar una sola vez en Supabase → Editor SQL → Run

create table experience_paquetes (
  id bigint generated always as identity primary key,
  orden int not null default 1,
  nombre text not null,
  color_key text not null default 'mini',
  piezas text not null,
  horas text not null,
  feature_1 text,
  feature_2 text,
  precio text not null,
  nota text,
  badge text,
  creado_en timestamptz not null default now()
);

alter table experience_paquetes enable row level security;

-- Lectura pública (la página de Experience la necesita sin login)
create policy "Lectura publica experience_paquetes" on experience_paquetes
  for select using (true);

-- Escritura solo para usuarios autenticados (panel admin con sesión iniciada)
create policy "Escritura autenticada experience_paquetes" on experience_paquetes
  for insert with check (auth.role() = 'authenticated');
create policy "Actualizacion autenticada experience_paquetes" on experience_paquetes
  for update using (auth.role() = 'authenticated');
create policy "Borrado autenticado experience_paquetes" on experience_paquetes
  for delete using (auth.role() = 'authenticated');

-- Paquetes iniciales (los mismos que ya se mostraban en la página)
insert into experience_paquetes (orden, nombre, color_key, piezas, horas, feature_1, feature_2, precio, nota, badge) values
  (1, 'Mini', 'mini', '10 piezas', '2 horas de servicio', '1 tipo de producto', '2-3 diseños base', '$2,300.00', 'Ideal para reuniones pequeñas', null),
  (2, 'Fiesta', 'fiesta', '40 piezas', '3 horas de servicio', 'Playeras + Tote bags', 'Diseño del evento incluido', '$7,500.00', 'El más popular', 'Más popular'),
  (3, 'Evento', 'evento', '80 piezas', '4 horas de servicio', '2-3 productos', 'Personalización de nombres/frases', '$14,500.00', 'Para fiestas y bodas', null),
  (4, 'Full Experience', 'full', '100+ piezas', '4-5 horas de servicio', 'Múltiples productos', 'Barra decorada premium', '$24,000+', 'La experiencia completa', 'Más completo');
