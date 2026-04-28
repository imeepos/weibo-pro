import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'

export function publishBuildOutput(stagingDir: string, targetDirs: readonly string[]): void {
  if (!existsSync(stagingDir)) {
    return
  }

  for (const targetDir of targetDirs) {
    syncBuildDirectory(stagingDir, targetDir)
  }
}

export function cleanupBuildOutput(directory: string): void {
  rmSync(directory, { recursive: true, force: true })
}

function syncBuildDirectory(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true })

  const entryNames = readdirSync(sourceDir)
  const prioritizedEntryNames = [
    ...entryNames.filter((entryName) => entryName !== 'index.html'),
    ...entryNames.filter((entryName) => entryName === 'index.html'),
  ]

  for (const entryName of prioritizedEntryNames) {
    cpSync(join(sourceDir, entryName), join(targetDir, entryName), {
      force: true,
      recursive: true,
    })
  }
}
