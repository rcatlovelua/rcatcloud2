import OpenAI from "openai";

export default async function handler(req, res) {
  // 1. Берем токены из Environment Variables на Vercel
  const VALID_TOKEN = process.env.rcaitkn; 
  const AI_SERVICE_TOKEN = process.env.rcaiaitoken;

  // 2. Извлекаем параметры из URL: ?token=..&role=..&msg=..&system=..&model=..
  const { token, role = "user", msg, system, model = "default" } = req.query;

  // Проверка вашего личного токена доступа
  if (!token || token !== VALID_TOKEN) {
    return res.status(401).json({ error: "Access denied: Invalid token." });
  }

  // Проверка наличия сообщения
  if (!msg) {
    return res.status(400).json({ error: "Missing 'msg' parameter." });
  }

  // Настройка клиента OpenAI для llm7.io
  const client = new OpenAI({
    baseURL: "https://api.llm7.io/v1",
    apiKey: AI_SERVICE_TOKEN,
  });

  try {
    // Формируем массив сообщений
    const messages = [];

    // Если передан системный промпт через &system=...
    if (system) {
      messages.push({ role: "system", content: system });
    }

    // Добавляем основное сообщение с указанной ролью (по умолчанию user)
    messages.push({ role: role, content: msg });

    const response = await client.chat.completions.create({
      model: model, 
      messages: messages,
    });

    // Возвращаем только текст ответа или весь объект
    return res.status(200).json({
      status: "success",
      reply: response.choices[0].message.content,
      model_used: model
    });

  } catch (error) {
    return res.status(500).json({ 
      error: "AI Service Error", 
      details: error.message 
    });
  }
}
