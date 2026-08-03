export function getBaseUrl(
  url: URL,
  configuredBaseUrl?: string
) {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (configuredBaseUrl && isLocalHost) {
    return `${configuredBaseUrl.replace(/\/$/, '')}/api/auth`
  }
  return `${url.origin}/api/auth`
}
