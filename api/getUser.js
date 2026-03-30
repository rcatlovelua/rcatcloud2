import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase (Берем данные из настроек Vercel)
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY 
);

export default async function handler(req, res) {
  // Разрешаем запросы (CORS), чтобы фронтенд мог достучаться до апи
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { id } = req.query;

  // Проверка: передал ли сайт ID пользователя
  if (!id) {
    return res.status(400).json({ error: 'ID пользователя не указан' });
  }

  try {
    // Ищем пользователя в таблице 'portal_users' (как в твоем боте)
    const { data, error } = await supabase
      .from('portal_users')
      .select('telegram_id, username, first_name, has_plus')
      .eq('telegram_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        exists: false, 
        message: 'Пользователь не найден в базе RCS' 
      });
    }

    // Возвращаем данные фронтенду
    return res.status(200).json({
      exists: true,
      telegram_id: data.telegram_id,
      username: data.username,
      first_name: data.first_name,
      has_plus: data.has_plus // Это самое важное для значка PLUS
    });

  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
}
