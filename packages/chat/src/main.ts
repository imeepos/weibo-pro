import 'dotenv/config';
import { createChatSession, closeSqlPool } from '@sker/chat';

async function main() {
  const databaseUrl = process.env.DATABASE_URL || '';

  const session = createChatSession(databaseUrl, {
    baseURL: 'http://localhost:8089/llm/openai',
    modelName: 'deepseek-ai/DeepSeek-V3.2',
  });

  console.log('🚀 会话已创建:', session.sessionId);
  // 测试对话
  const response = await session.sendMessage(`回顾并汇报一下你现在已有的知识库`);
  console.log('🤖 回复:', response);

  await closeSqlPool();
}

main();
