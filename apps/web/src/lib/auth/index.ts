import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

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
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
  ],
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
