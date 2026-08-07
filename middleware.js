// middleware.js
// ✅ Правильный импорт для Edge Runtime
import { NextResponse } from 'next/server';

const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ'];

export function middleware(request) {
  // Получаем страну из geo (работает только на Vercel)
  const country = request.geo?.country;
  
  console.log('🌍 Detected country:', country); // Для отладки

  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    // Перенаправляем на страницу 403
    return NextResponse.rewrite(
      new URL('/403notbecauseyou.html', request.url)
    );
  }

  return NextResponse.next();
}

// 👇 ЯВНО указываем Edge runtime
export const runtime = 'edge';

// 👇 Конфиг для middleware
export const config = {
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
