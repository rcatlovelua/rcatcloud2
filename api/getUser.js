import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto'; // Встроенный модуль Node.js для хеширования

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY 
);

// ... (начало кода то же самое)

export default async function handler(req, res) {
  const { id, pass } = req.query;

  if (!id) return res.status(400).json({ error: 'ID не указан' });

  try {
    const { data, error } = await supabase
      .from('portal_users')
      .select('*')
      .eq('telegram_id', id)
      .single();

    if (error || !data) return res.status(404).json({ exists: false });

    // Базовый ответ
    let response = {
      exists: true,
      username: data.username,
      has_plus: data.has_plus
    };

    // Если в запросе ПРИШЕЛ пароль, добавляем проверку
    if (pass) {
      const inputHash = crypto.createHash('sha256').update(pass).digest('hex');
      response.pass_correct = (inputHash === data.password_hash);
    }

    return res.status(200).json(response);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

    // Хешируем полученный пароль через SHA-256 (как в Python-боте)
    const inputHash = crypto.createHash('sha256').update(pass).digest('hex');

    // Сравниваем хеши
    const isPassCorrect = inputHash === data.password_hash;

    if (!isPassCorrect) {
      return res.status(401).json({
        exists: true,
        pass_correct: false,
        message: 'Неверный пароль'
      });
    }

    // Если всё ок — возвращаем данные
    return res.status(200).json({
      exists: true,
      pass_correct: true,
      telegram_id: data.telegram_id,
      username: data.username,
      first_name: data.first_name,
      has_plus: data.has_plus
    });

  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
}
