export function getBaseUrl(
  url: URL,
  configuredBaseUrl?: string
) {
  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, '')}/api/auth`
  }
  return `${url.origin}/api/auth`
}
