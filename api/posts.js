import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'POST') {
    const { title, content, password, author, timestamp } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    const id = Date.now();
    const postData = {
      id,
      title: title || "Без заголовка",
      content: content || "",
      author: author || "Аноним",
      timestamp: timestamp || id,
      replies: []
    };

    await redis.set(`post:${id}`, JSON.stringify(postData));
    await redis.lpush('posts_list', `post:${id}`);
    
    return res.status(200).json({ success: true, post: postData });
  }

  if (req.method === 'GET') {
    try {
      const keys = await redis.lrange('posts_list', 0, 50);
      
      if (keys.length === 0) {
        return res.status(200).json([]);
      }
      
      const postsData = await redis.mget(...keys);
      
      const posts = postsData
        .filter(p => p !== null)
        .map(p => typeof p === 'string' ? JSON.parse(p) : p)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      return res.status(200).json(posts);
    } catch (e) {
      console.error('Redis error:', e);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
  }

  return res.status(405).json({ error: 'Метод запрещен' });
}
