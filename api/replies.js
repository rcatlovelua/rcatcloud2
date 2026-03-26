import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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
    // Получаем текущий пост
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', Number(postId))
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const newReply = {
      id: Date.now(),
      content: content.trim(),
      author: author.trim(),
      timestamp: Date.now()
    };

    const updatedReplies = post.replies ? [...post.replies, newReply] : [newReply];
    
    // Обновляем пост с новыми ответами
    const { error: updateError } = await supabase
      .from('posts')
      .update({ replies: updatedReplies })
      .eq('id', Number(postId));

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
    
    return res.status(200).json({ success: true, reply: newReply });
  } catch (error) {
    console.error('Reply error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
