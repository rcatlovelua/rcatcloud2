import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод запрещен' });
  }

  const { postId, content, author, password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Неверный пароль' });
  }

  if (!postId) {
    return res.status(400).json({ error: 'ID поста обязателен' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Текст ответа обязателен' });
  }

  if (!author || !author.trim()) {
    return res.status(400).json({ error: 'Имя автора обязательно' });
  }

  try {
    const postKey = `post:${postId}`;
    const postData = await redis.get(postKey);
    
    if (!postData) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const post = typeof postData === 'string' ? JSON.parse(postData) : postData;
    
    const newReply = {
      id: Date.now(),
      content: content.trim(),
      author: author.trim(),
      timestamp: Date.now()
    };

    const updatedReplies = post.replies ? [...post.replies, newReply] : [newReply];
    post.replies = updatedReplies;
    
    await redis.set(postKey, JSON.stringify(post));
    
    return res.status(200).json({ success: true, reply: newReply });
  } catch (error) {
    console.error('Reply error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
