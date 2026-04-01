import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const VALID_TOKEN = process.env.rcaitkn; 
  const AI_SERVICE_TOKEN = process.env.rcaiaitoken;

  // Добавляем id (telegram_id) в параметры
  const { token, id, msg, system, model = "gpt-3.5-turbo" } = req.query;

  if (!token || token !== VALID_TOKEN) return res.status(401).json({ error: "Invalid token" });
  if (!id || !msg) return res.status(400).json({ error: "Missing id or msg" });

  const client = new OpenAI({
    baseURL: "https://api.llm7.io/v1",
    apiKey: AI_SERVICE_TOKEN,
  });

  try {
    // 1. ПОЛУЧАЕМ ИСТОРИЮ ИЗ SUPABASE
    const { data: history } = await supabase
      .from('portal_messages')
      .select('role, content')
      .eq('telegram_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. ФОРМИРУЕМ ПАКЕТ ДЛЯ ИИ
    const messages = [];
    if (system) messages.push({ role: "system", content: system });

    // Добавляем старые сообщения (нужно развернуть массив, чтобы порядок был верный)
    if (history) {
      history.reverse().forEach(m => messages.push({ role: m.role, content: m.content }));
    }

    // Добавляем текущее сообщение юзера
    messages.push({ role: "user", content: msg });

    // 3. ЗАПРОС К ИИ
    const response = await client.chat.completions.create({
      model: model, 
      messages: messages,
    });

    const aiReply = response.choices[0].message.content;

    // 4. СОХРАНЯЕМ ДИАЛОГ В БАЗУ (Параллельно, чтобы не тормозить ответ)
    await supabase.from('portal_messages').insert([
      { telegram_id: id, role: 'user', content: msg },
      { telegram_id: id, role: 'assistant', content: aiReply }
    ]);

    return res.status(200).json({
      status: "success",
      reply: aiReply,
      history_count: messages.length // Для отладки
    });

  } catch (error) {
    return res.status(500).json({ error: "AI Error", details: error.message });
  }
}
