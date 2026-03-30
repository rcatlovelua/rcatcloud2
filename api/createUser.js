// /api/createUser.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { id, username, first_name } = req.body;

    if (!id) {
        return res.status(400).json({ error: "No ID" });
    }

    // проверяем есть ли пользователь
    const { data: existing } = await supabase
        .from('portal_users')
        .select('*')
        .eq('telegram_id', id)
        .single();

    if (!existing) {
        await supabase.from('portal_users').insert({
            telegram_id: id,
            username: username || `user_${id}`,
            first_name,
            has_plus: false
        });
    }

    res.json({ ok: true });
}
