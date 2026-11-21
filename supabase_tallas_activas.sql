-- Happy Prints — Activar/desactivar talla adulto e infantil por separado
-- Ejecutar una sola vez en Supabase → Editor SQL → Run

alter table productos add column talla_adulto_activo boolean not null default true;
alter table productos add column talla_infantil_activo boolean not null default true;
