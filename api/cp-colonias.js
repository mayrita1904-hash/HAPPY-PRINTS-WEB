// Función serverless Vercel: consulta codigos.zip del lado del servidor para no
// exponer la API key en el navegador ni tener que abrir el CSP a un dominio externo.
module.exports = async (req, res) => {
  const cp = (req.query.cp || '').replace(/\D/g, '');
  if (cp.length !== 5) {
    res.status(400).json({ error: 'Código postal inválido' });
    return;
  }

  try {
    const r = await fetch(`https://api.codigos.zip/api/zip/${cp}?pais=MX`, {
      headers: { 'X-API-Key': process.env.CODIGOS_ZIP_API_KEY }
    });
    const data = await r.json();
    if (!r.ok || !data.colonias || !data.colonias.length) {
      res.status(404).json({ error: 'No se encontraron colonias para ese código postal' });
      return;
    }
    const primero = data.colonias[0];
    res.status(200).json({
      colonias: data.colonias.map(c => c.colonia).filter(Boolean),
      ciudad: primero.municipio || primero.ciudad || '',
      estado: primero.estado || ''
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
