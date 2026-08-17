const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// === НАСТРОЙКИ SUPABASE ===
const supabaseUrl = 'https://xonlaprqfhtawlgvmvuk.supabase.co';
// Если в Vercel не добавлена переменная среды, используем ключ по умолчанию
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_6q6etbaxkdyr_2k1qojv2a_lb6djkvg';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET-запрос: Загрузка сообщений
app.get(['/messages', '/'], async (req, res) => {
    const { chat_id } = req.query;
    if (!chat_id) return res.status(400).json({ error: 'chat_id обязателен' });

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true })
        .limit(150);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST-запрос: Сохранение сообщения
app.post(['/messages', '/'], async (req, res) => {
    const { chat_id, sender_id, sender, ciphertext, iv, salt } = req.body;

    const { data, error } = await supabase
        .from('messages')
        .insert([{ chat_id, sender_id, sender, ciphertext, iv, salt }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// Экспортируем приложение для Vercel (чтобы работали бессерверные функции)
module.exports = app;
