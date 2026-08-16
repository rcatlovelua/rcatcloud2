import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  const { code } = req.query;
  const appUrl = process.env.APP_URL || 'https://justrcat.lol';
  const targetUrl = `${appUrl}/fixed`;

  if (!code) {
    return res.redirect(`${targetUrl}?auth_error=no_code`);
  }

  try {
    // 1. Получаем токен от Яндекса
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YANDEX_CLIENT_ID,
        client_secret: process.env.YANDEX_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to get Yandex token');

    // 2. Получаем профиль из Яндекса
    const userRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const email = userData.default_email || `${userData.id}@yandex.custom`;
    const name = userData.display_name || userData.real_name || userData.login || 'Пользователь Яндекса';
    const secretPass = `yandex_auth_${userData.id}_${process.env.SUPABASE_SERVICE_ROLE.slice(0, 12)}`;

    // 3. Создаем или обновляем пользователя в Supabase
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === email);

    if (!existing) {
      await supabase.auth.admin.createUser({
        email,
        password: secretPass,
        email_confirm: true,
        user_metadata: { full_name: name, yandex_id: userData.id }
      });
    } else {
      await supabase.auth.admin.updateUserById(existing.id, {
        password: secretPass,
        user_metadata: { full_name: name, yandex_id: userData.id }
      });
    }

    // 4. Генерируем сессию
    const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password: secretPass,
    });

    if (loginErr || !sessionData.session) throw (loginErr || new Error('Auth session error'));

    // 5. Перенаправляем на /fixed с хэш-токенами
    const { access_token, refresh_token } = sessionData.session;
    return res.redirect(`${targetUrl}#access_token=${access_token}&refresh_token=${refresh_token}&token_type=bearer`);

  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return res.redirect(`${targetUrl}?auth_error=${encodeURIComponent(err.message)}`);
  }
}
