import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VITE_API_URL || 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: []
});

export type AuthClient = typeof authClient;
export type Session = AuthClient['$Infer']['Session'];