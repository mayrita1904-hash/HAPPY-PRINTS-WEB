const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { type, path, device, ref, ts, label, depth, seconds } = body || {};
  if (!type || !path) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }

  const day = new Date(ts || Date.now()).toISOString().slice(0, 10);

  try {
    const pipe = redis.pipeline();
    if (type === 'pageview') {
      pipe.incr(`hp:views:${day}`);
      pipe.hincrby('hp:paths', path, 1);
      pipe.hincrby('hp:devices', device || 'desconocido', 1);
      if (ref) pipe.hincrby('hp:referrers', ref, 1);
    } else if (type === 'click') {
      pipe.hincrby('hp:clicks', label || 'sin-nombre', 1);
    } else if (type === 'scroll') {
      pipe.hincrby(`hp:scroll:${depth}`, path, 1);
    } else if (type === 'time' && seconds) {
      pipe.lpush('hp:times', seconds);
      pipe.ltrim('hp:times', 0, 999);
    }
    pipe.lpush('hp:recent', JSON.stringify({ type, path, device, label, depth, seconds, ts: ts || Date.now() }));
    pipe.ltrim('hp:recent', 0, 199);
    await pipe.exec();
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
