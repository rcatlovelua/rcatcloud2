// middleware.js

const ALLOWED_COUNTRIES = ['RU', 'BY', 'KZ', 'DE'];

export function middleware(request) {
  const country = 
    request.headers.get('x-vercel-ip-country') || 
    request.geo?.country;

  if (country && !ALLOWED_COUNTRIES.includes(country)) {
    const rewriteUrl = new URL('/403notbecauseyou.html', request.url);
    
    // Эквивалент NextResponse.rewrite() на чистом Web API
    return new Response(null, {
      headers: {
        'x-middleware-rewrite': rewriteUrl.toString(),
      },
    });
  }

  // Эквивалент NextResponse.next()
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
    },
  });
}

export const config = {
  matcher: [
    '/((?!403notbecauseyou\\.html|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
