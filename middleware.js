// middleware.js

import { NextResponse } from 'next/server';

// Добавили Германию ('DE')
const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ', 'DE'];

export function middleware(request) {
  // Получаем код страны из заголовка Vercel или из request.geo
  const country = 
    request.headers.get('x-vercel-ip-country') || 
    request.geo?.country;
  
  console.log('🌍 Detected country:', country);

  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    // Перенаправляем на страницу 403
    return NextResponse.rewrite(
      new URL('/403notbecauseyou.html', request.url)
    );
  }

  return NextResponse.next();
}

// Конфиг для middleware (матчинг путей)
export const config = {
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
