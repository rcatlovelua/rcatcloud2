import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(req, res) {
    const { uid } = req.query;

    if (!uid) {
        return res.status(400).json({ error: "Не указан uid" });
    }

    try {
        // Ищем запись с таким uid
        const { data, error } = await supabase
            .from('rrm_users')
            .select('is_registered, extensions') // extensions - если добавишь такую колонку (jsonb)
            .eq('uid', uid.toString())
            .single();

        // Если записи нет (ошибка PGROUTINE: нет строк)
        if (error && error.code === 'PGRST116') {
            return res.status(200).json({
                IsRegistered: false,
                uid: uid
            });
        }

        // Если произошла другая ошибка базы
        if (error) throw error;

        // Если игрок найден
        return res.status(200).json({
            IsRegistered: data.is_registered,
            uid: uid,
            extensions: data.extensions || [] // Отдаем модули, если они есть
        });

    } catch (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ error: "Ошибка базы данных" });
    }
}
