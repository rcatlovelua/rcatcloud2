import { next } from '@vercel/edge';

export const config = {
  // Применяем middleware ко всем страницам, чтобы работали заголовки безопасности
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};

export default function middleware(req) {
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') || '';

  // 1. Проверка доступа к папке RACOlie
  if (url.pathname.startsWith('/RACOlie/')) {
    if (!ua.includes('Roblox')) {
      return new Response(
        JSON.stringify({ error: "Access Denied", message: "Roblox-only directory" }), 
        { 
          status: 403, 
          headers: { 'content-type': 'application/json' } 
        }
      );
    }
  }

  // 2. Если проверка пройдена или путь другой, отдаем страницу с вашими заголовками
  return next({
    headers: {
      'Referrer-Policy': 'origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'on',
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',
    },
  });
}
