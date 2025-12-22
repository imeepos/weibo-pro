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
  const response = await session.sendMessage('写一个武侠小说的大纲，包括人物及人物管理，核心世界观设定，核心人物人物魅力个性，时间线等等，思考：实现一个小说都需要哪些流程设定才能实现一个出色的小说');
  console.log('🤖 回复:', response);

  await closeSqlPool();
}

main();
