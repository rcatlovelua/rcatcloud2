import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto'; // Добавляем для хеширования

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, pass } = req.query; // Забираем и id, и pass

  if (!id) return res.status(400).json({ error: 'ID не указан' });

  try {
    // 1. Получаем инфо о юзере (обязательно тянем password_hash для сравнения)
    const { data: user, error: userErr } = await supabase
      .from('portal_users')
      .select('username, has_plus, password_hash')
      .eq('telegram_id', id)
      .single();

    if (userErr || !user) return res.status(404).json({ exists: false });

    // 2. Проверяем пароль, если он передан в запросе
    let passCorrect = false;
    if (pass) {
      const inputHash = crypto.createHash('sha256').update(pass).digest('hex');
      passCorrect = (inputHash === user.password_hash);
    }

    // 3. Достаем 10 последних сообщений
    const { data: history } = await supabase
      .from('portal_messages')
      .select('role, content')
      .eq('telegram_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Формируем чистый ответ (без хеша пароля!)
    return res.status(200).json({
      exists: true,
      username: user.username,
      has_plus: user.has_plus,
      pass_correct: passCorrect, // Тот самый флаг
      history: history ? history.reverse() : []
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
