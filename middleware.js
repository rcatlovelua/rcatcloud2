// middleware.js
import { NextResponse } from 'next/server';

const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ'];

export function middleware(request) {
  // В Edge Runtime request.geo ДОЛЖЕН работать на Vercel
  const country = request.geo?.country;

  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    // В Edge используем только URL конструктор
    const url = new URL('/403notbecauseyou.html', request.url);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// 👇 Явно указываем Edge (это по умолчанию, но для ясности)
export const runtime = 'edge';

export const config = {
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
