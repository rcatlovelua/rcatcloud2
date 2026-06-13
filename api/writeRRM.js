import { createClient } from '@supabase/supabase-js'

// Инициализация Supabase через переменные окружения (EV)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(req, res) {
    // Настраиваем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { uid } = req.query;

    if (!uid) {
        return res.status(400).json({ error: "Не указан uid" });
    }

    try {
        // Записываем игрока в таблицу rrm_users. 
        // upsert означает: если такой uid уже есть, он обновит запись, а не выдаст ошибку.
        const { data, error } = await supabase
            .from('rrm_users')
            .upsert([
                { uid: uid.toString(), is_registered: true }
            ], { onConflict: 'uid' })
            .select();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            uid: uid, 
            message: "Зарегистрировали!" 
        });

    } catch (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ error: "Ошибка при записи в базу", details: error.message });
    }
}
