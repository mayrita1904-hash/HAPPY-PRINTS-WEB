-- Happy Prints — Permisos del bucket de Storage "productos"
-- Hasta ahora este bucket no tenía ninguna política propia de escritura, así que
-- cualquier visitante (sin cuenta) podía subir, sobreescribir o BORRAR cualquier
-- archivo con solo la anon key. Este script deja:
--   - Lectura pública: la sigue dando el toggle "Public bucket" del bucket (no RLS).
--   - Subida (insert): sigue abierta a propósito — el flujo de "Pedir por WhatsApp"
--     sube la foto de referencia/diseño del cliente ANTES de que exista una sesión,
--     así que no se puede exigir estar autenticado aquí. La protección real contra
--     archivos maliciosos ya la da el límite de tipo/tamaño configurado en el bucket
--     (Storage -> productos -> Edit bucket -> Restrict file size / MIME types).
--   - Actualizar/borrar: SOLO la administradora. Ningún flujo del sitio necesita que
--     un cliente sobreescriba o borre un archivo ya subido — los uploads de clientes
--     siempre usan un nombre nuevo con timestamp (carpeta pedidos/...), nunca pisan
--     uno existente.
-- Ejecutar una sola vez en Supabase -> Editor SQL -> Run

create policy "Subida publica productos" on storage.objects
  for insert with check (bucket_id = 'productos');

create policy "Actualizacion admin productos" on storage.objects
  for update using (
    bucket_id = 'productos'
    and exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Borrado admin productos" on storage.objects
  for delete using (
    bucket_id = 'productos'
    and exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );
