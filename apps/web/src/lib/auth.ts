/**
 * Auth module for AIOS v2
 * Development mode: bypass auth for local testing
 */

export async function auth() {
  // Development mode: return mock session
  if (process.env.NODE_ENV === 'development') {
    return {
      user: {
        id: 'dev-user',
        name: 'Developer',
        email: 'dev@aios.local',
      },
    };
  }
  
  // Production: implement proper NextAuth
  throw new Error('Auth not configured for production');
}

export default auth;
