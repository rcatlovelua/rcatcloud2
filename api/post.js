import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // Обработка создания поста
  if (req.method === 'POST') {
    const { title, content, password } = req.body;

    // Сверяем пароль из запроса с паролем в Vercel
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    const id = Date.now();
    await redis.set(`post:${id}`, JSON.stringify({ title, content }));
    return res.status(200).json({ success: true });
  }

  // Обработка получения постов
  const keys = await redis.keys('post:*');
  if (keys.length === 0) return res.status(200).json([]);

  const posts = await Promise.all(keys.map(key => redis.get(key)));
  res.status(200).json(posts);
}
