import { next } from '@vercel/edge';

export const config = {
  // Применяем middleware ко всем страницам, чтобы работали заголовки безопасности
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};

// Единый набор заголовков безопасности для всех ответов
const securityHeaders = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'on',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

export default function middleware(req) {
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') || '';

  // 1. Директория только для Roblox: блокируем всё, что не от клиента Roblox
  if (url.pathname.startsWith('/RACOnlie/') && !ua.includes('Roblox')) {
    return new Response(
      JSON.stringify({ error: 'Access Denied', message: 'Roblox-only directory' }),
      {
        status: 403,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          ...securityHeaders,
        },
      }
    );
  }

  // 2. Если проверка пройдена или путь другой, отдаем страницу с заголовками безопасности
  return next({ headers: securityHeaders });
}
