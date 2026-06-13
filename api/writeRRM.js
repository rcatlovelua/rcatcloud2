import { createClient } from '@supabase/supabase-js'

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

    // Забираем параметры. Поддерживаем и uid, и username на всякий случай
    const uid = req.query.uid;
    const username = req.query.username;

    // Если нет ни того, ни другого — выдаем понятную ошибку, а не просто "400"
    if (!uid && !username) {
        return res.status(400).json({ 
            error: "Пустой запрос. Не указан uid.", 
            receivedData: req.query // Покажет в ответе, что реально дошло до сервера
        });
    }

    // Если пришел username, а не uid, напоминаем, что бэк ждет именно ID
    if (!uid && username) {
        return res.status(400).json({ 
            error: "Сервер получил username, но для базы нужен числовой uid из Роблокса.", 
            receivedUsername: username 
        });
    }

    try {
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
