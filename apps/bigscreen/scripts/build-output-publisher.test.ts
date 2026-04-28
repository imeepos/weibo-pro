import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import { publishBuildOutput } from './build-output-publisher'

const tempDirs: string[] = []

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('publishBuildOutput', () => {
  it('copies a successful staging build into the live directory', () => {
    const stagingDir = createTempDir('bigscreen-staging-')
    const liveDir = createTempDir('bigscreen-live-')

    mkdirSync(join(stagingDir, 'assets/js'), { recursive: true })
    writeFileSync(join(stagingDir, 'assets/js/app.js'), 'new-asset')
    writeFileSync(join(stagingDir, 'index.html'), '<html>new-build</html>')
    writeFileSync(join(liveDir, 'index.html'), '<html>old-build</html>')

    publishBuildOutput(stagingDir, [liveDir])

    expect(readFileSync(join(liveDir, 'assets/js/app.js'), 'utf8')).toBe('new-asset')
    expect(readFileSync(join(liveDir, 'index.html'), 'utf8')).toBe('<html>new-build</html>')
  })

  it('leaves the live directory untouched when the staging build is missing', () => {
    const stagingDir = join(createTempDir('bigscreen-missing-'), 'missing-build')
    const liveDir = createTempDir('bigscreen-live-')
    const originalHtml = '<html>keep-existing</html>'

    writeFileSync(join(liveDir, 'index.html'), originalHtml)

    publishBuildOutput(stagingDir, [liveDir])

    expect(readFileSync(join(liveDir, 'index.html'), 'utf8')).toBe(originalHtml)
  })
})
