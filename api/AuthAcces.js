app.post('/api/admin/delete', async (req, res) => {
  const clientKey = req.headers['authorization'];

  // 1. Проверка вашего кастомного ключа
  if (clientKey !== process.env.ADMINPLUS_KEY) {
    return res.status(403).json({ error: 'Access Denied' });
  }

  // 2. Инициализация Supabase на стороне сервера
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 3. Выполнение опасной операции
  const { data, error } = await supabase.from('posts').delete().eq('id', req.body.id);
  
  res.json({ success: true, data });
});
