import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(process.cwd(), 'src');
const reactImportPattern =
  /import\s+React\b(?:\s*,|\s+from|\s*\{)|import\s+\*\s+as\s+React\s+from\s+['"]react['"]/;
const excludedPatterns = [/\.test\.tsx$/, /\.spec\.tsx$/];

function collectTsxFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectTsxFiles(fullPath, files);
      continue;
    }

    if (!fullPath.endsWith('.tsx')) {
      continue;
    }

    if (excludedPatterns.some((pattern) => pattern.test(fullPath))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

describe('classic react runtime compatibility', () => {
  it('requires every non-test TSX file to import React explicitly', () => {
    const missingReactImports = collectTsxFiles(srcRoot)
      .filter((filePath) => !reactImportPattern.test(fs.readFileSync(filePath, 'utf8')))
      .map((filePath) => path.relative(srcRoot, filePath));

    expect(
      missingReactImports,
      `Missing React imports:\n${missingReactImports.join('\n')}`,
    ).toEqual([]);
  });
});
