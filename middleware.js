// middleware.js
import { next, rewrite, geolocation } from '@vercel/edge';

export const config = {
  // Пропускаем сам файл 403, статику Vercel и любые файлы с расширением
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};

const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ', 'DE'];

export default function middleware(request) {
  // geolocation() корректно достаёт страну из заголовков Vercel
  const { country } = geolocation(request);
  const resolvedCountry =
    country || request.headers.get('x-vercel-ip-country') || '';

  // Если страна известна и не входит в список разрешённых — показываем 403
  if (resolvedCountry && !ALLOWED_COUNTRIES.includes(resolvedCountry)) {
    return rewrite(new URL('/403notbecauseyou.html', request.url));
  }

  return next();
}
