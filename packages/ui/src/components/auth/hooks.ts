import { authClient } from './auth';

export const useSession = authClient.useSession;

export const useAuth = () => ({
  signIn: authClient.signIn.email,
  signUp: authClient.signUp.email,
  signInWithOAuth: authClient.signIn.social,
  signOut: authClient.signOut,
  getSession: authClient.getSession,
  resetPassword: authClient.resetPassword,
  changePassword: authClient.changePassword,
  updateUser: authClient.updateUser,
});
