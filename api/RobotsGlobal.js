// В реальности лучше хранить это в Environment Variables на Vercel
const ADMIN_KEY = "rcs_cm9ibG94Y3JlYXRpb25zX3JvYm90c19ldmVudGFwaQ=="; //atob decoded word robloxcreations_robots_eventapi

// Временное хранилище (сбросится при обновлении сервера)
// Для постоянства используй Vercel KV
let events = {
  event1: { status: "deacticated", duration: 0, name: "" },
  event2: { status: "deactivated", duration: 0, name: "" }
};

export default async function handler(req, res) {
  const userKey = req.headers['x-api-key'];

  // 1. Обработка GET (просмотр из игры)
  if (req.method === 'GET') {
    return res.status(200).json(events);
  }

  // 2. Проверка ключа для изменений (POST/PATCH)
  if (userKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Access denied: Invalid API Key" });
  }

  if (req.method === 'POST') {
    const { eventId, status, duration, name } = req.body;
    
    if (events[eventId]) {
      events[eventId] = { status, duration, name };
      return res.status(200).json({ success: true, updated: events[eventId] });
    }
    
    return res.status(404).json({ error: "Event not found" });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
