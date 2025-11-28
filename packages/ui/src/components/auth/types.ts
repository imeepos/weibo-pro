import type { AuthClient, Session } from './auth';

export type { AuthClient, Session };

export type SessionState = any;

export type User = NonNullable<Session['user']>;

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

export const getAuthStatus = (session: SessionState): AuthStatus => {
  if (session.isPending) return 'loading';
  if (session.data?.user) return 'authenticated';
  return 'unauthenticated';
};
