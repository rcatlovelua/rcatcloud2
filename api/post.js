import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { title, content } = req.body;
    const postId = Date.now(); // Простой ID на основе времени
    
    await redis.set(`post:${postId}`, JSON.stringify({ title, content }));
    return res.status(200).json({ success: true, id: postId });
  }

  // Получение всех постов (пример)
  const keys = await redis.keys('post:*');
  const posts = await Promise.all(keys.map(key => redis.get(key)));
  
  res.status(200).json(posts);
}
