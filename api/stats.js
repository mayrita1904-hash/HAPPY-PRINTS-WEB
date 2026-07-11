const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

module.exports = async (req, res) => {
  const key = req.query.key || req.headers['x-dashboard-key'];
  if (!process.env.DASHBOARD_KEY || key !== process.env.DASHBOARD_KEY) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const pipe = redis.pipeline();
    days.forEach(d => pipe.get(`hp:views:${d}`));
    pipe.hgetall('hp:paths');
    pipe.hgetall('hp:devices');
    pipe.hgetall('hp:clicks');
    pipe.hgetall('hp:referrers');
    pipe.lrange('hp:times', 0, 999);

    const results = await pipe.exec();
    const viewsByDay = days.map((d, i) => ({ day: d, views: Number(results[i]) || 0 }));
    const paths = results[14] || {};
    const devices = results[15] || {};
    const clicks = results[16] || {};
    const referrers = results[17] || {};
    const times = (results[18] || []).map(Number);
    const avgSeconds = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    res.status(200).json({
      totalViews: viewsByDay.reduce((a, b) => a + b.views, 0),
      viewsByDay, paths, devices, clicks, referrers, avgSeconds
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
