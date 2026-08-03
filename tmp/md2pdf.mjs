import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { globSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

function resolvePkg(name) {
  const pat = path.join(root, 'node_modules', '.pnpm', `${name}@*`, 'node_modules', name);
  const hits = globSync(pat);
  if (!hits.length) throw new Error(`cannot find ${name} in pnpm store`);
  return hits[0];
}

// marked 18 is ESM
const markedPath = path.join(resolvePkg('marked'), 'lib', 'marked.esm.js');
const marked = await import(pathToFileURL(markedPath).href);
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(resolvePkg('playwright-core'), 'index.js'));

const md = readFileSync(path.join(root, '2..md'), 'utf8');
const html = marked.parse(md);

const CSS = `
  @page { size: A4; margin: 22mm 20mm 22mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", sans-serif;
    color: #1f2328; line-height: 1.75; font-size: 13.5px;
    max-width: 100%;
  }
  h1 {
    font-size: 26px; text-align: center; margin: 8px 0 6px; color: #111;
    line-height: 1.4;
  }
  h2 {
    font-size: 19px; margin: 30px 0 12px; padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb; color: #1a1a1a; page-break-after: avoid;
  }
  h3 { font-size: 15.5px; margin: 20px 0 8px; color: #333; page-break-after: avoid; }
  p { margin: 10px 0; text-align: justify; }
  strong { color: #111; }
  blockquote {
    margin: 14px 0; padding: 12px 16px; background: #f6f8fa;
    border-left: 4px solid #4f6ef2; border-radius: 0 6px 6px 0; color: #374151;
    page-break-inside: avoid;
  }
  blockquote p { margin: 4px 0; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-family: Consolas, monospace; font-size: 0.9em; }
  pre { background: #f6f8fa; padding: 14px; border-radius: 8px; overflow-x: auto; }
  ul, ol { padding-left: 24px; margin: 10px 0; }
  li { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background: #f9fafb; }
  .report-id { text-align: center; color: #6b7280; font-size: 13px; margin: 0 0 8px; }
`;

const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>${CSS}</style>
</head>
<body>
${html}
</body>
</html>`;

const chromePath = 'C:/Users/imeep/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
if (!existsSync(chromePath)) throw new Error('chromium not found: ' + chromePath);

mkdirSync(path.join(root, 'output', 'pdf'), { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(doc, { waitUntil: 'load' });
  // ensure CJK fonts are ready
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  const out = path.join(root, 'output', 'pdf', '2-report.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' },
  });
  console.log('PDF written:', out);
} finally {
  await browser.close();
}
