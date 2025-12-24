import { BrowserManager, CDPBrowser, type BrowserConfig } from '@sker/crawler-core';

// 示例 1: 基础浏览器使用
async function basicExample() {
  const manager = new BrowserManager();

  const config: BrowserConfig = {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
  };

  const { browser, context } = await manager.launch(config);
  const page = await context.newPage();

  await page.goto('https://weibo.com');
  await page.screenshot({ path: 'weibo.png' });

  await manager.release(browser);
}

// 示例 2: 使用代理
async function proxyExample() {
  const manager = new BrowserManager();

  const config: BrowserConfig = {
    headless: true,
    proxy: {
      server: 'http://proxy.example.com:8080',
      username: 'user',
      password: 'pass',
    },
  };

  const { browser, context } = await manager.launch(config);
  const page = await context.newPage();

  await page.goto('https://weibo.com');

  await manager.close(browser);
}

// 示例 3: CDP 模式
async function cdpExample() {
  const cdp = new CDPBrowser();

  await cdp.connect('http://localhost:9222');

  const manager = new BrowserManager();
  const { browser, context } = await manager.launch({
    cdpEndpoint: 'http://localhost:9222',
  });

  const page = await context.newPage();
  const session = await cdp.createSession(page);

  await cdp.enableNetwork();
  await cdp.setUserAgent('Custom User Agent');

  await page.goto('https://weibo.com');

  await cdp.close();
  await manager.close(browser);
}

// 示例 4: Cookie 持久化
async function storageExample() {
  const manager = new BrowserManager();

  const { browser, context } = await manager.launch();

  // 保存存储状态
  await manager.saveStorage(context, './storage.json');

  // 加载存储状态
  const storageState = require('./storage.json');
  await manager.loadStorage(context, storageState);

  await manager.close(browser);
}

// 示例 5: 浏览器池复用
async function poolExample() {
  const manager = new BrowserManager(5, 300000); // 最多 5 个实例，5 分钟超时

  const tasks = Array.from({ length: 10 }, async (_, i) => {
    const { browser, context } = await manager.launch({ headless: true });
    const page = await context.newPage();

    await page.goto(`https://weibo.com/u/${i}`);
    const title = await page.title();

    await manager.release(browser);
    return title;
  });

  const results = await Promise.all(tasks);
  await manager.closeAll();
}
