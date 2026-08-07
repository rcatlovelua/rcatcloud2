// middleware.js
import { NextResponse } from 'next/server';

// 👇 Явно указываем использовать Node.js, а не Edge
export const runtime = 'nodejs';

const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ'];

export function middleware(request) {
  const country = request.geo?.country || request.headers.get('x-vercel-ip-country');

  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    return NextResponse.rewrite(new URL('/403notbecauseyou.html', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
