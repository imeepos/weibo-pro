import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createChatSession } from '@sker/chat';

const HELP_TEXT = `
╔════════════════════════════════════════════════════════════╗
║  智能对话助手 - 命令帮助                                  ║
╠════════════════════════════════════════════════════════════╣
║  /help      - 显示此帮助信息                               ║
║  /clear     - 清除屏幕                                     ║
║  /exit      - 退出程序                                     ║
║  /multi     - 进入多行输入模式                             ║
║             按 Ctrl+D (Unix) 或 Ctrl+Z (Windows) 结束     ║
║  /history   - 显示对话历史                                 ║
╠════════════════════════════════════════════════════════════╣
║  提示：直接输入消息即可开始对话                            ║
║  支持超长富文本输入，使用 /multi 模式                      ║
╚════════════════════════════════════════════════════════════╝
`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || '';

  const session = createChatSession(databaseUrl, {
    baseURL: 'http://localhost:8089/llm/openai',
    modelName: 'deepseek-ai/DeepSeek-V3.2',
  });

  const rl = readline.createInterface({ input, output });
  const history: Message[] = [];

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🤖 智能对话助手已启动                                    ║');
  console.log('║  会话 ID:', session.sessionId.padEnd(41), '║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  输入 /help 查看命令帮助                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  let running = true;

  while (running) {
    try {
      const userInput = await rl.question('\n💬 你: ');
      const input = userInput.trim();

      if (!input) continue;

      // 处理命令
      if (input.startsWith('/')) {
        const command = input.toLowerCase();

        if (command === '/help') {
          console.log(HELP_TEXT);
          continue;
        }

        if (command === '/exit') {
          console.log('\n👋 再见！');
          running = false;
          break;
        }

        if (command === '/clear') {
          console.clear();
          console.log('🤖 屏幕已清除\n');
          continue;
        }

        if (command === '/multi') {
          console.log('\n📝 多行输入模式 (输入空行后按 Ctrl+D 结束):');
          console.log('─'.repeat(60));
          const lines: string[] = [];

          // 多行输入循环
          while (true) {
            try {
              const line = await rl.question('');
              lines.push(line);
            } catch (err) {
              // Ctrl+D 触发
              break;
            }
          }

          const multiLineInput = lines.join('\n').trim();
          if (!multiLineInput) {
            console.log('⚠️  未输入任何内容');
            continue;
          }

          // 处理多行输入
          console.log('\n🤔 思考中...\n');
          const response = await session.sendMessage(multiLineInput);

          history.push(
            { role: 'user', content: multiLineInput, timestamp: new Date() },
            { role: 'assistant', content: response, timestamp: new Date() }
          );

          console.log('─'.repeat(60));
          console.log('🤖 助手:\n');
          console.log(response);
          console.log('─'.repeat(60));
          continue;
        }

        if (command === '/history') {
          console.log('\n📜 对话历史:\n');
          console.log('═'.repeat(60));

          if (history.length === 0) {
            console.log('  暂无对话记录');
          } else {
            for (const msg of history) {
              const time = msg.timestamp.toLocaleTimeString('zh-CN');
              const icon = msg.role === 'user' ? '💬' : '🤖';
              const label = msg.role === 'user' ? '你' : '助手';
              const preview = msg.content.length > 50
                ? msg.content.slice(0, 50) + '...'
                : msg.content;

              console.log(`${icon} [${time}] ${label}: ${preview}`);
              console.log('─'.repeat(60));
            }
          }

          console.log('═'.repeat(60));
          continue;
        }

        console.log(`❌ 未知命令: ${input}`);
        console.log('   输入 /help 查看可用命令');
        continue;
      }

      // 普通对话
      console.log('\n🤔 思考中...\n');
      const response = await session.sendMessage(input);

      history.push(
        { role: 'user', content: input, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );

      console.log('─'.repeat(60));
      console.log('🤖 助手:\n');
      console.log(response);
      console.log('─'.repeat(60));

    } catch (error) {
      console.error('\n❌ 错误:', error instanceof Error ? error.message : '未知错误');
    }
  }

  rl.close();
  await session.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 程序错误:', error);
  process.exit(1);
});
