// /api/getUser.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "No ID" });
    }

    const { data } = await supabase
        .from('portal_users')
        .select('*')
        .eq('telegram_id', id)
        .single();

    res.json(data);
}
