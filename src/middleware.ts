import { proxy } from './proxy'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return proxy(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)',
  ],
}
