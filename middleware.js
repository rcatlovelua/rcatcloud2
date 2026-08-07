import { NextResponse } from 'next/server';

// 1. Укажите двухбуквенные ISO-коды разрешённых стран
const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ']; // Замените на ваши страны

export function middleware(request) {
  // 2. Получаем код страны из Vercel Geolocation API
  const country = request.geo?.country || request.headers.get('x-vercel-ip-country');

  // 3. Если страна определена и её НЕТ в белом списке — перенаправляем
  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    // NextResponse.rewrite сохраняет исходный URL, но показывает содержимое страницы 403.
    // Если нужно именно изменить URL в браузере пользователя, замените .rewrite на .redirect
    return NextResponse.rewrite(new URL('/403notbecauseyou.html', request.url));
  }

  return NextResponse.next();
}

// 4. Важно: исключаем саму страницу 403 и статические файлы из проверки,
// чтобы не получить бесконечный цикл редиректов.
export const config = {
  matcher: [
    /*
     * Применять middleware к всем маршрутам, КРОМЕ:
     * - /403notbecauseyou.html (сама страница ошибки)
     * - системных файлов (_next, favicon и т.д.)
     * - статических ресурсов (картинки, CSS, JS)
     */
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
