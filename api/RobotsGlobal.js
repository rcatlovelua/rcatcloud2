// файл: api/events.js

// Временное хранилище эвентов.
// Важно: при спящем режиме Vercel эти данные могут сбрасываться. 
// Для надежности позже можно будет подключить бесплатную базу Vercel KV (Redis).
let eventsData = {
  "event1": { "status": "activated", "time": 120, "name": "NextbotRush" },
  "event2": { "status": "deactivated", "time": null, "name": null }
};

const API_KEY = "rcs_cm9ibG94Y3JlYXRpb25zX3JvYm90c19ldmVudGFwaQ==";

export default function handler(req, res) {
  // Защита: проверяем API-ключ из заголовков
  const providedKey = req.headers['x-api-key'];
  
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: "Доступ запрещен. Неверный API ключ!" });
  }

  // Если Роблокс запрашивает статус эвентов (GET запрос)
  if (req.method === 'GET') {
    return res.status(200).json(eventsData);
  } 
  
  // Если мы хотим изменить эвент (POST запрос)
  else if (req.method === 'POST') {
    const { eventId, status, time, name } = req.body;
    
    if (eventId) {
      eventsData[eventId] = { status, time, name };
      return res.status(200).json({ success: true, message: "Эвент обновлен", data: eventsData });
    } else {
      return res.status(400).json({ error: "Не указан eventId" });
    }
  } 
  
  else {
    return res.status(405).json({ error: "Метод не разрешен" });
  }
}
