import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'POST') {
    // Исправлено: принимаем оба варианта названия поля для совместимости
    const { title, content, password, author, imageUrl, imageurl } = req.body;
    
    // Нормализуем имя поля - если есть imageUrl (с большой U), используем его, иначе imageurl
    const finalImageUrl = imageUrl || imageurl || null;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    const id = Date.now();
    
    // ЛОГ ДЛЯ ОТЛАДКИ
    console.log("📝 Attempting insert with ID:", id);
    console.log("🖼️ Image URL received:", finalImageUrl);
    console.log("📦 Full body:", req.body);

    const { data, error } = await supabase
      .from('posts')
      .insert([{ 
        id: id, 
        title: title || "Без заголовка", 
        content: content || "", 
        author: author || "Аноним", 
        imageurl: finalImageUrl, // Сохраняем в нижнем регистре в базе
        timestamp: id, 
        replies: [] 
      }])
      .select(); // Добавляем .select() чтобы получить вставленные данные

    if (error) {
      console.error("❌ SUPABASE ERROR:", error);
      return res.status(500).json({ 
        error: error.message, 
        details: error.details,
        hint: error.hint 
      });
    }

    console.log("✅ Successfully inserted post with image:", finalImageUrl);
    return res.status(200).json({ success: true, id, imageUrl: finalImageUrl });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error("❌ GET error:", error);
      return res.status(500).json({ error: error.message });
    }
    
    // Логируем, что есть посты с картинками
    const postsWithImages = data.filter(post => post.imageurl);
    console.log(`📸 Found ${postsWithImages.length} posts with images out of ${data.length} total`);
    
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Метод запрещен' });
}
