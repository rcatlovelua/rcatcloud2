export default function handler(req, res) {
  // Разрешаем только POST запросы для безопасности
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  
  // Сравниваем пароль из запроса с переменной окружения
  if (password === process.env.ADMINPLUS_KEY) {
    return res.status(200).json({ 
      success: true, 
      token: "SESSION_ACTIVE_XYZ", // В идеале тут должен быть JWT, но для начала хватит и этого
      supatkn: process.env.SUPABASE_URL,
      supasrl: process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Access Denied' 
    });
  }
}
