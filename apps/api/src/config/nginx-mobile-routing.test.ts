import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('nginx mobile routing', () => {
  it('redirects /mobile to /mobile/ with a relative location so the external port is preserved', () => {
    const nginxConfig = readFileSync(resolve(__dirname, '../../../../nginx/nginx.conf'), 'utf8')

    expect(nginxConfig).toMatch(/server\s*\{[^}]*absolute_redirect\s+off;/s)
    expect(nginxConfig).toMatch(/location\s+=\s+\/mobile\s*\{[^}]*return\s+301\s+\/mobile\/;/s)
  })
})
