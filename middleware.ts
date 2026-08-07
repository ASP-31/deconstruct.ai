import { NextResponse, type NextRequest } from 'next/server';

const BASE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

function buildCsp(): string {
  const directives = [
    ...BASE_CSP,
    `script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://*.googleusercontent.com",
    "manifest-src 'self'",
    "media-src 'self' blob:",
  ];
  return directives.join('; ');
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp());
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (!response.headers.has('Strict-Transport-Security')) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
