import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    const { code, state } = req.query; // state — это наш temp_code из Роблокса

    if (!code || !state) return res.status(400).send('Ошибка авторизации');

    // 1. Обмениваем временный код Дискорда на токен
    const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/discord-callback`,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokens = await response.json();
    
    // 2. Получаем данные пользователя
    const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userData = await userRes.json();

    // 3. Обновляем данные в Redis (связываем Discord ID с Roblox ID)
    const existing = await kv.get(`link:${state}`);
    if (existing) {
        await kv.set(`link:${state}`, { 
            ...existing, 
            discord_id: userData.id, 
            discord_tag: `${userData.username}`,
            status: 'linked' 
        }, { ex: 300 });
    }

    // 4. Перекидываем на страницу успеха
    res.redirect('/success.html');
}
