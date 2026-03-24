import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // ВАЖНО: Отключаем кэш, чтобы новые посты появлялись сразу
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'POST') {
    const { title, content, password, author, postId } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    if (postId) {
      const postKey = `post:${postId}`;
      const post = await redis.get(postKey);
      if (!post) return res.status(404).json({ error: 'Пост не найден' });

      const newReply = {
        id: Date.now(),
        content: content.trim(),
        author: author || 'Аноним',
        timestamp: Date.now()
      };

      const updatedReplies = post.replies ? [...post.replies, newReply] : [newReply];
      await redis.set(postKey, { ...post, replies: updatedReplies });
      return res.status(200).json({ success: true, reply: newReply });
    }

    const id = Date.now();
    const postData = {
      id,
      title: title || "Без заголовка",
      content: content || "",
      author: author || "Аноним",
      timestamp: id,
      replies: []
    };

    await redis.set(`post:${id}`, postData);
    await redis.lpush('posts_list', `post:${id}`);
    return res.status(200).json({ success: true, post: postData });
  }

  if (req.method === 'GET') {
    try {
      let keys = await redis.lrange('posts_list', 0, 50); 
      if (keys.length === 0) keys = await redis.keys('post:*');
      
      // Исправленный mget, чтобы не падал на пустых ключах
      const posts = keys.length > 0 ? await redis.mget(...keys) : [];
      
      const sorted = posts
        .filter(p => p !== null)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      return res.status(200).json(sorted);
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка базы' });
    }
  }

  return res.status(405).json({ error: 'Метод запрещен' });
}
