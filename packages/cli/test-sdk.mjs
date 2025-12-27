/**
 * SDK 诊断脚本
 */
import { query } from '@anthropic-ai/claude-agent-sdk';

console.log('[Test] 开始测试 SDK...');

try {
  const queryInstance = query({
    prompt: 'hello',
    options: {
      model: 'sonnet',
      cwd: process.cwd(),
    }
  });

  console.log('[Test] Query 实例创建成功:', typeof queryInstance);
  console.log('[Test] Query 实例方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(queryInstance)));

  let messageCount = 0;
  const startTime = Date.now();

  for await (const message of queryInstance) {
    messageCount++;
    const elapsed = Date.now() - startTime;
    console.log(`[Test] 消息 #${messageCount} (${elapsed}ms):`, {
      type: message.type,
      hasSessionId: !!message.session_id,
      keys: Object.keys(message),
    });

    // 打印完整消息（前3条）
    if (messageCount <= 3) {
      console.log('[Test] 完整消息:', JSON.stringify(message, null, 2));
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Test] 完成: 共 ${messageCount} 条消息, 耗时 ${totalTime}ms`);

} catch (error) {
  console.error('[Test] 错误:', error);
  console.error('[Test] 错误堆栈:', error.stack);
}
