import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    const { temp_code } = req.query;
    const data = await kv.get(`link:${temp_code}`);

    if (!data) return res.status(404).json({ error: "Код просрочен или неверен" });

    // Если статус linked, значит юзер прошел через Дискорд
    res.status(200).json(data); 
}
