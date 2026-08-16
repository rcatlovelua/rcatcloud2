export default function handler(req, res) {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL || 'https://justrcat.lol'}/api/auth/callback`;
  
  const yandexAuthUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(yandexAuthUrl);
}
