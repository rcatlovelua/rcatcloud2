import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'POST') {
    const { title, content, password, author } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Неверный пароль' });
    }

    const id = Date.now();
    const { error } = await supabase
      .from('posts')
      .insert([{ 
        id, 
        title: title || "Без заголовка", 
        content: content || "", 
        author: author || "Аноним", 
        timestamp: id, 
        replies: [] 
      }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, id });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Метод запрещен' });
}
