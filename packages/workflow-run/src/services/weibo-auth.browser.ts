import { chromium, Browser } from "playwright";

/**
 * 启动 Playwright 无头浏览器实例
 *
 * 集中管理浏览器启动参数，便于复用与维护。
 * @param headless 是否以无头模式启动
 */
export async function launchBrowser(headless: boolean): Promise<Browser> {
  return chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });
}
