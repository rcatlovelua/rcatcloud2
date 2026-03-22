import { createClient } from '@supabase/supabase-js';

// Эти данные ты возьмешь из Settings -> API в Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { roblox_id, temp_code } = req.body;

    // Записываем "заготовку" в базу
    const { error } = await supabase
        .from('rcs_links') // Название таблицы, которую мы создали в SQL Editor
        .insert([{ 
            roblox_id: roblox_id, 
            temp_code: temp_code, 
            is_linked: false 
        }]);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ success: true });
}
