export { proxy as middleware } from './src/proxy'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)',
  ],
}
