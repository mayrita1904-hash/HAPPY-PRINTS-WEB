-- Happy Prints — Agregar cantidad y precio unitario a las líneas de cotización
-- Reemplaza el precio de texto libre por cantidad + precio unitario numéricos,
-- para poder calcular el subtotal por línea y el total de la cotización automáticamente.
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run
-- (Solo aplícalo si la tabla cotizacion_renglones está vacía o no te importa perder su contenido actual.)

alter table cotizacion_renglones
  add column cantidad numeric not null default 1,
  add column precio_unitario numeric not null default 0;

alter table cotizacion_renglones
  drop column precio_texto;
