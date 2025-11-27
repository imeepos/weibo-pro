import { createAuthClient } from "better-auth/react";
import {
  usernameClient, anonymousClient, phoneNumberClient,
  magicLinkClient, emailOTPClient, genericOAuthClient, adminClient,
  apiKeyClient, organizationClient, oidcClient,
  deviceAuthorizationClient, lastLoginMethodClient, multiSessionClient,
  oneTimeTokenClient, jwtClient
} from "better-auth/client/plugins"
import { InjectionToken, root } from '@sker/core'
import { passkeyClient } from "@better-auth/passkey/client"
export const BETTER_AUTH_BASE_URL = new InjectionToken<string>(`BETTER_AUTH_BASE_URL`)
const getBaseURL = () => {
  return root.get(BETTER_AUTH_BASE_URL, `/`);
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    deviceAuthorizationClient(),
    lastLoginMethodClient(),
    multiSessionClient(),
    oneTimeTokenClient(),
    jwtClient(),
    usernameClient(),
    anonymousClient(),
    phoneNumberClient(),
    magicLinkClient(),
    emailOTPClient(),
    passkeyClient(),
    genericOAuthClient(),
    adminClient(),
    apiKeyClient(),
    organizationClient(),
    oidcClient(),
  ]
});

export type AuthClient = typeof authClient;
export type Session = AuthClient['$Infer']['Session'];