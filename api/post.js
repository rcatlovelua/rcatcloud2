import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // 1. Обработка создания поста
  if (req.method === 'POST') {
    const { title, content, password, author } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    const id = Date.now();
    const postData = {
      id,
      title: title || "Без заголовка",
      content: content || "",
      author: author || "Аноним",
      createdAt: new Date().toISOString(),
      timestamp: id
    };
    
    // Сохраняем пост
    await redis.set(`post:${id}`, postData); 
    // Добавляем ID в общий список (чтобы не использовать slow 'keys')
    await redis.lpush('posts_list', `post:${id}`);

    return res.status(200).json({ success: true, post: postData });
  }

  // 2. Обработка получения постов
  if (req.method === 'GET') {
    try {
      // Получаем ключи через список (быстро) или через keys (если список еще пуст)
      let keys = await redis.lrange('posts_list', 0, 100); // берем последние 100
      
      if (keys.length === 0) {
        // Фолбек на случай, если список пуст (для старых постов)
        keys = await redis.keys('post:*');
      }

      if (keys.length === 0) return res.status(200).json([]);

      // Используем mget — это ОДИН запрос к базе вместо кучи запросов в цикле
      const posts = await redis.mget(...keys);
      
      // Фильтруем пустые значения и отдаем
      return res.status(200).json(posts.filter(p => p !== null));

    } catch (error) {
      console.error('Ошибка:', error);
      return res.status(500).json({ error: 'Ошибка загрузки' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
