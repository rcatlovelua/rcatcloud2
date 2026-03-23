import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    const { roblox_id, temp_code } = req.body;
    
    // Сохраняем на 5 минут (300 секунд)
    await kv.set(`link:${temp_code}`, { roblox_id, status: 'pending' }, { ex: 300 });

    res.status(200).json({ success: true });
}
