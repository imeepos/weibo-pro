export const STEALTH_SCRIPT = `
(() => {
  // WebDriver 检测绕过
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // Chrome 对象模拟
  window.chrome = { runtime: {} };

  // Permissions API 绕过
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters)
  );

  // Plugins 长度修复
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5]
  });

  // Languages 修复
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en']
  });
})();
`;
