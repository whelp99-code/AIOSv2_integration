import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/signin', '/auth/error', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
