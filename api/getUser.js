import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;

  try {
    // 1. Получаем инфо о юзере
    const { data: user, error: userErr } = await supabase
      .from('portal_users')
      .select('username, has_plus')
      .eq('telegram_id', id)
      .single();

    if (userErr || !user) return res.status(404).json({ exists: false });

    // 2. Достаем 10 последних сообщений
    const { data: history } = await supabase
      .from('portal_messages')
      .select('role, content')
      .eq('telegram_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      exists: true,
      username: user.username,
      has_plus: user.has_plus,
      history: history ? history.reverse() : [] // Переворачиваем, чтобы старые были сверху
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
