export enum LoginMethod {
  QrCode = 'qrcode',
  Cookie = 'cookie',
  Credentials = 'credentials',
}

export interface LoginResult {
  success: boolean
  message?: string
  cookies?: Record<string, string>
}

export interface ILogin {
  begin(): Promise<void>
  loginByQrcode(): Promise<LoginResult>
  loginByCookie(cookies: Record<string, string>): Promise<LoginResult>
  isLoggedIn(): Promise<boolean>
}
