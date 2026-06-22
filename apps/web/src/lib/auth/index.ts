import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
export { useSession } from 'next-auth/react'

const providers = []

// Add GitHub provider only if credentials are configured
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  )
}

// Always add credentials provider for development
providers.push(
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      // For development, accept any credentials
      if (process.env.NODE_ENV === 'development') {
        return {
          id: 'dev-user',
          email: (credentials?.email as string) || 'dev@example.com',
          name: 'Developer',
        }
      }
      return null
    },
  })
)

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: (() => {
    const s = process.env.NEXTAUTH_SECRET;
    if (!s || s.length < 32) {
      throw new Error('NEXTAUTH_SECRET must be set and at least 32 chars');
    }
    return s;
  })(),
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})
