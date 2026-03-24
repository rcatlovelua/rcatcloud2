import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // --- 1. СОЗДАНИЕ (ПОСТ ИЛИ ОТВЕТ) ---
  if (req.method === 'POST') {
    const { title, content, password, author, postId } = req.body;

    // Проверка пароля (общая для всех)
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    // ЛОГИКА ОТВЕТА (если пришел postId)
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

      // Добавляем ответ в массив внутри поста
      const updatedReplies = post.replies ? [...post.replies, newReply] : [newReply];
      await redis.set(postKey, { ...post, replies: updatedReplies });

      return res.status(200).json({ success: true, reply: newReply });
    }

    // ЛОГИКА НОВОГО ПОСТА
    const id = Date.now();
    const postData = {
      id,
      title: title || "Без заголовка",
      content: content || "",
      author: author || "Аноним",
      timestamp: id,
      replies: [] // Сразу создаем пустой массив для ответов
    };

    await redis.set(`post:${id}`, postData);
    await redis.lpush('posts_list', `post:${id}`); // Для быстрого получения списка

    return res.status(200).json({ success: true, post: postData });
  }

  // --- 2. ПОЛУЧЕНИЕ ВСЕХ ПОСТОВ ---
  if (req.method === 'GET') {
    try {
      // Пытаемся взять ключи из списка (это быстро)
      let keys = await redis.lrange('posts_list', 0, 50); 
      
      if (keys.length === 0) keys = await redis.keys('post:*');
      if (keys.length === 0) return res.status(200).json([]);

      // Тянем все данные одним запросом (mget)
      const posts = await redis.mget(...keys);
      
      // Сортируем: новые сверху
      const sorted = posts
        .filter(p => p !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      return res.status(200).json(sorted);
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка базы' });
    }
  }

  return res.status(405).json({ error: 'Метод запрещен' });
}
