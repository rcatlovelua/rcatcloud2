import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Поддерживаем оба варианта названия ключа
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

export default async function handler(req, res) {
  const { code } = req.query;
  const appUrl = process.env.APP_URL || 'https://justrcat.lol';
  const targetUrl = `${appUrl}/fixed`;

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('Missing Supabase keys:', { supabaseUrl: !!supabaseUrl, supabaseServiceRole: !!supabaseServiceRole });
    return res.status(500).json({ error: 'Server configuration error: missing Supabase keys' });
  }

  // дальше ваш код...


  if (!code) {
    return res.redirect(`${targetUrl}?auth_error=no_code`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Получаем токен от Яндекса
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        client_id: process.env.YANDEX_CLIENT_ID || '',
        client_secret: process.env.YANDEX_CLIENT_SECRET || '',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get Yandex token');
    }

    // 2. Получаем профиль из Яндекса
    const userRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.id) {
      throw new Error('Failed to fetch Yandex user profile');
    }

    const email = userData.default_email || `${userData.id}@yandex.custom`;
    const name = userData.display_name || userData.real_name || userData.login || 'Пользователь Яндекса';
    const secretPass = `yandex_auth_${userData.id}_${supabaseServiceRole.slice(0, 12)}`;

    // 3. Создаем или обновляем пользователя
    const { data: userDataObj, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: secretPass,
      email_confirm: true,
      user_metadata: { full_name: name, yandex_id: userData.id },
    });

    // Если пользователь уже существует, обновляем пароль и метаданные
    if (createErr) {
      const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listData?.users?.find((u) => u.email === email);

      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password: secretPass,
          user_metadata: { full_name: name, yandex_id: userData.id },
        });
      } else {
        throw createErr;
      }
    }

    // 4. Генерируем сессию
    const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password: secretPass,
    });

    if (loginErr || !sessionData?.session) {
      throw loginErr || new Error('Auth session error');
    }

    // 5. Перенаправляем с хэш-токенами
    const { access_token, refresh_token } = sessionData.session;
    return res.redirect(`${targetUrl}#access_token=${access_token}&refresh_token=${refresh_token}&token_type=bearer`);

  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return res.redirect(`${targetUrl}?auth_error=${encodeURIComponent(err.message || 'unknown_error')}`);
  }
}
