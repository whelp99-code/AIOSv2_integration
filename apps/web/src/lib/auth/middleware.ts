import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isPublicRoute = ['/', '/auth/signin', '/auth/error'].includes(req.nextUrl.pathname)

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow API routes
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Redirect to signin if not logged in
  if (!isLoggedIn && !isAuthPage) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
