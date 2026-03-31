import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, pass } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID не указан' });
  }

  try {
    // Выбираем данные. Пароль берем только для проверки, 
    // но НЕ отправляем его в итоговом ответе.
    const { data, error } = await supabase
      .from('portal_users')
      .select('telegram_id, username, first_name, has_plus, password_hash')
      .eq('telegram_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ exists: false, message: 'Пользователь не найден' });
    }

    // Базовый ответ (без пароля)
    let response = {
      exists: true,
      telegram_id: data.telegram_id,
      username: data.username,
      first_name: data.first_name,
      has_plus: data.has_plus
    };

    // Если передан пароль — проверяем его
    if (pass) {
      const inputHash = crypto.createHash('sha256').update(pass).digest('hex');
      response.pass_correct = (inputHash === data.password_hash);
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
